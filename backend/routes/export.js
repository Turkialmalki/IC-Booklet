import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { renderPagesToPdf } from '../renderers/pdf.js'
import { renderToPptx } from '../renderers/pptx.js'
import { resolveImage, buildAssetIndex } from '../resolvers/assets.js'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const TMPL_DIR    = join(__dirname, '../../storage/templates')
const ASSETS_DIR  = join(__dirname, '../../storage/assets')
const EXPORTS_DIR = join(__dirname, '../../storage/exports')
mkdirSync(EXPORTS_DIR, { recursive: true })

// ── In-memory job store (no Redis needed) ────────────────────────────────────
// job: { status, progress, result, error, listeners: Set }
const jobs = new Map()

function createJob(jobId) {
  const job = { status: 'queued', progress: { percent: 0, current: 0, total: 0, phase: '' }, result: null, error: null, listeners: new Set() }
  jobs.set(jobId, job)
  return job
}

function emitProgress(jobId, data) {
  const job = jobs.get(jobId)
  if (!job) return
  job.progress = data
  for (const cb of job.listeners) cb('progress', data)
}

function emitDone(jobId, result) {
  const job = jobs.get(jobId)
  if (!job) return
  job.status = 'done'
  job.result = result
  for (const cb of job.listeners) cb('done', result)
  job.listeners.clear()
}

function emitFailed(jobId, error) {
  const job = jobs.get(jobId)
  if (!job) return
  job.status = 'failed'
  job.error = error
  for (const cb of job.listeners) cb('failed', { error })
  job.listeners.clear()
}

// ── SSE helper ───────────────────────────────────────────────────────────────
function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ── PPTX page helpers ────────────────────────────────────────────────────────

// Returns true if a page has any data-bound elements or {{var}} text
function pageHasPlaceholders(pageJson, bindings) {
  if (!pageJson?.children) return false
  for (const el of pageJson.children) {
    if (bindings?.[el.id]) return true
    if (el.type === 'text' && el.text?.includes('{{')) return true
  }
  return false
}

// Build page list for export.
//
// "Booklet mode" (activated when any cover or back page has data placeholders):
//   For EACH row → emit all template pages in order (cover + slides + back),
//   merging row data with exportMeta so every page has access to both.
//
// "Report mode" (no placeholders on cover/back):
//   cover pages  → once (exportMeta)
//   slide pages without placeholders → once
//   slide pages with placeholders    → once per row
//   back pages   → once (exportMeta)
async function buildPptxPages(templatePages, rows, bindings, columnBindings, exportMeta, assetIndex, layoutRules) {
  const coverPages = templatePages.filter(p => p.role === 'cover')
  const backPages  = templatePages.filter(p => p.role === 'back')
  const slidePages = templatePages.filter(p => p.role === 'slide')

  const bookletMode =
    coverPages.some(p => pageHasPlaceholders(p.polotnoJson, bindings)) ||
    backPages.some(p =>  pageHasPlaceholders(p.polotnoJson, bindings))

  const pages = []

  if (bookletMode) {
    // One full booklet per row: cover → slides → back, all with row data
    for (const row of rows) {
      const rowData = { ...exportMeta, ...row }   // row takes priority
      for (const page of templatePages) {
        const p = mergePageData(page.polotnoJson, rowData, bindings, columnBindings, layoutRules)
        await resolvePageImages(p, assetIndex)
        pages.push(p)
      }
    }
  } else {
    // Report mode: cover/back once, per-row only for dynamic slides
    const staticSlides = slidePages.filter(p => !pageHasPlaceholders(p.polotnoJson, bindings))
    const dynSlides    = slidePages.filter(p =>  pageHasPlaceholders(p.polotnoJson, bindings))

    for (const page of coverPages) {
      const p = mergePageData(page.polotnoJson, exportMeta, bindings, columnBindings, layoutRules)
      await resolvePageImages(p, assetIndex)
      pages.push(p)
    }
    for (const page of staticSlides) {
      const p = mergePageData(page.polotnoJson, exportMeta, bindings, columnBindings, layoutRules)
      await resolvePageImages(p, assetIndex)
      pages.push(p)
    }
    for (const row of rows) {
      const rowData = { ...exportMeta, ...row }
      for (const page of dynSlides) {
        const p = mergePageData(page.polotnoJson, rowData, bindings, columnBindings, layoutRules)
        await resolvePageImages(p, assetIndex)
        pages.push(p)
      }
    }
    for (const page of backPages) {
      const p = mergePageData(page.polotnoJson, exportMeta, bindings, columnBindings, layoutRules)
      await resolvePageImages(p, assetIndex)
      pages.push(p)
    }
  }

  return pages
}

// ── Render helpers ───────────────────────────────────────────────────────────

// Column lookup with underscore ↔ space normalisation fallback
function lookupCol(rowData, col) {
  if (!rowData || col == null) return undefined
  let val = rowData[col]
  if (val !== undefined) return val
  if (col.includes('_')) {
    val = rowData[col.replace(/_/g, ' ')]
    if (val !== undefined) return val
  }
  if (col.includes(' ')) {
    val = rowData[col.replace(/ /g, '_')]
    if (val !== undefined) return val
  }
  return undefined
}

function interpolate(text, rowData, columnBindings) {
  if (!text || !text.includes('{{')) return text
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const col = columnBindings?.[key] || key
    const val = lookupCol(rowData, col)
    return (val !== undefined && val !== null) ? String(val) : match
  })
}

function isArabicText(text) {
  if (!text || text.length === 0) return false
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  return arabicChars / text.length >= 0.4
}

function estimateLineCount(text, containerWidth, fontSize) {
  if (!text || !containerWidth || !fontSize) return 1
  const charsPerLine = Math.max(1, containerWidth / (fontSize * 0.55))
  return text.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil((line.length || 1) / charsPerLine))
  }, 0)
}

function convertToBulletList(text) {
  const parts = text.split(/(?<=[.؛!?])\s+|\n+/).map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) return `• ${text.trim()}`
  return parts.map(p => `• ${p}`).join('\n')
}

const BIND_PROPS = [
  'imageFit', 'imageFrame', 'isBackground', 'maxAreaPercent', 'isLogo',
  'resizeToFit', 'shrinkOnOverflow', 'minFontSize', 'rtl',
]

function mergePageData(pageJson, rowData, bindings, columnBindings, layoutRules) {
  const merged = JSON.parse(JSON.stringify(pageJson))
  if (!merged.children) return merged
  for (const el of merged.children) {
    const binding = bindings?.[el.id]
    if (binding) {
      // Copy rendering properties from binding onto element
      for (const prop of BIND_PROPS) {
        if (binding[prop] !== undefined) el[prop] = binding[prop]
      }
      const col   = binding.column ? (columnBindings?.[binding.column] || binding.column) : null
      const value = lookupCol(rowData, col)
      if (binding.property === 'url') {
        // Display text: prefer staticLabel (new), fall back to label column (backward compat)
        if (binding.staticLabel) {
          el.text = binding.staticLabel
        } else if (binding.column && binding.column !== binding.urlColumn) {
          if (value !== undefined && value !== null && value !== '') {
            el.text = String(value)
          }
        }
        // href from URL column (binding.urlColumn)
        const urlColName = columnBindings?.[binding.urlColumn] || binding.urlColumn
        if (urlColName) {
          const urlValue = lookupCol(rowData, urlColName)
          if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
            el.href = String(urlValue)
          }
        }
      } else if (value !== undefined && value !== null && value !== '') {
        if (binding.property === 'text') {
          let text = String(value)
          // RTL auto-detection
          if (el.rtl === undefined && isArabicText(text)) el.rtl = true
          // Overflow → bulleted list
          const threshold = layoutRules?.overflowLineThreshold ?? 5
          if (estimateLineCount(text, el.width || 400, el.fontSize || 16) > threshold) {
            text = convertToBulletList(text)
            el.lineHeight = layoutRules?.bulletLineSpacing || 1.2
          }
          el.text = text
        } else if (binding.property === 'src') {
          el.src = String(value)
        }
      }
      // Logo pinning
      if (binding.isLogo && layoutRules?.logoPosition) {
        const lp = layoutRules.logoPosition
        const pageH = merged.height || 1080
        const pageW = merged.width  || 1920
        if (lp.corner === 'bottom-left') {
          el.x = lp.x ?? 24
          el.y = pageH + (lp.y ?? -80)
        } else if (lp.corner === 'bottom-right') {
          el.x = pageW - (el.width || 200) - (lp.x ?? 24)
          el.y = pageH + (lp.y ?? -80)
        }
      }
      // Title centering
      if (binding.styleRef === 'title' && layoutRules?.titleAlign === 'center') {
        el.align = 'center'
      }
    }
    // Template-string interpolation for {{var}} in text elements
    if (el.type === 'text' && el.text?.includes('{{')) {
      el.text = interpolate(el.text, rowData, columnBindings)
    }
  }
  return merged
}

// Inject a page-number text element into every page's children array.
// Call AFTER buildPptxPages so total is known.
function injectSlideNumbers(pages, slideNumbering) {
  if (!slideNumbering?.enabled) return pages
  const total  = pages.length
  const style  = slideNumbering.style || {}
  const font   = style.font   || 'Inter'
  const size   = style.size   || 11
  const color  = style.color  || '#888888'
  const format = slideNumbering.format || 'page_x_of_y'

  return pages.map((page, idx) => {
    const label = format === 'page_x_of_y'
      ? `Page ${idx + 1} of ${total}`
      : String(idx + 1)
    const w = page.width  || 1920
    const h = page.height || 1080
    const numEl = {
      id: `__pagenum_${idx}`,
      type: 'text',
      x: w - 120,
      y: h - 36,
      width: 104,
      height: 24,
      text: label,
      fontSize: size,
      fill: color,
      fontFamily: font,
      align: 'right',
      opacity: 1,
    }
    return { ...page, children: [...(page.children || []), numEl] }
  })
}

async function resolvePageImages(pageJson, assetIndex) {
  for (const el of pageJson.children || []) {
    if (el.type === 'image' && el.src) {
      el.src = await resolveImage(el.src, assetIndex)
    }
  }
  return pageJson
}

// ── Background export runner ─────────────────────────────────────────────────
async function runExport(jobId, { templateId, format, rows, columnBindings, exportMeta, assetJobId, outputFilename }) {
  try {
    const tmplFile = join(TMPL_DIR, `${templateId}.json`)
    if (!existsSync(tmplFile)) throw new Error(`Template not found: ${templateId}`)
    const template   = JSON.parse(readFileSync(tmplFile, 'utf-8'))
    const textStyles = template.textStyles || {}
    const bindings   = template.bindings   || {}

    const assetIndex = (assetJobId && existsSync(join(ASSETS_DIR, assetJobId)))
      ? buildAssetIndex(join(ASSETS_DIR, assetJobId))
      : {}

    const templatePages  = template.pages || []
    const layoutRules    = template.layoutRules    || {}
    const slideNumbering = template.slideNumbering || {}
    if (templatePages.length === 0) throw new Error('No pages to render. Design at least one page in the editor.')

    // Build the page list once for both PDF and PPTX:
    //   cover pages       → rendered once
    //   slide pages without placeholders → rendered once
    //   slide pages with placeholders    → rendered once per data row
    //   back pages        → rendered once
    const rowsToProcess = rows.length > 0 ? rows : [{}]

    emitProgress(jobId, { current: 0, total: 1, percent: 5, phase: 'building pages', currentRowName: '' })
    let exportPages = await buildPptxPages(templatePages, rowsToProcess, bindings, columnBindings, exportMeta || {}, assetIndex, layoutRules)

    // Inject slide-number footer elements now that total page count is known
    exportPages = injectSlideNumbers(exportPages, slideNumbering)
    const totalPages  = exportPages.length

    const outputs = []

    if (format === 'pdf' || format === 'both') {
      emitProgress(jobId, { current: 0, total: totalPages, percent: 15, phase: 'rendering PDF', currentRowName: '' })
      const buf = await renderPagesToPdf(exportPages, textStyles)
      writeFileSync(join(EXPORTS_DIR, `${jobId}.pdf`), buf)
      outputs.push({ format: 'pdf', filename: `${outputFilename}.pdf`, downloadUrl: `/storage/exports/${jobId}.pdf` })
      emitProgress(jobId, { current: totalPages, total: totalPages, percent: format === 'both' ? 60 : 95, phase: 'PDF done', currentRowName: '' })
    }

    if (format === 'pptx' || format === 'both') {
      emitProgress(jobId, { current: 0, total: totalPages, percent: format === 'both' ? 65 : 15, phase: 'rendering PPTX', currentRowName: '' })
      const buf = await renderToPptx(exportPages, textStyles)
      writeFileSync(join(EXPORTS_DIR, `${jobId}.pptx`), buf)
      outputs.push({ format: 'pptx', filename: `${outputFilename}.pptx`, downloadUrl: `/storage/exports/${jobId}.pptx` })
      emitProgress(jobId, { current: totalPages, total: totalPages, percent: 95, phase: 'PPTX done', currentRowName: '' })
    }

    emitDone(jobId, { jobId, status: 'done', outputs, rowCount: rows.length })
  } catch (err) {
    emitFailed(jobId, err.message)
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────
export default async function exportRoutes(fastify) {

  // POST /api/export/start
  fastify.post('/start', async (req, reply) => {
    const {
      templateId,
      format         = 'pdf',
      rows           = [],
      columnBindings = {},
      exportMeta     = {},
      assetJobId,
      outputFilename = 'export',
    } = req.body || {}

    if (!templateId) return reply.code(400).send({ error: 'templateId is required' })

    const jobId = `job_${uuidv4().slice(0, 8)}`
    createJob(jobId)

    // Fire-and-forget — runs in background without blocking this response
    setImmediate(() => runExport(jobId, { templateId, format, rows, columnBindings, exportMeta, assetJobId, outputFilename }))

    return reply.code(202).send({ jobId, status: 'queued' })
  })

  // GET /api/export/progress/:jobId — SSE stream
  fastify.get('/progress/:jobId', async (req, reply) => {
    const { jobId } = req.params
    const job = jobs.get(jobId)

    reply.hijack()
    const res = reply.raw
    res.setHeader('Content-Type',      'text/event-stream')
    res.setHeader('Cache-Control',     'no-cache')
    res.setHeader('Connection',        'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    if (!job) {
      sseWrite(res, 'error', { message: 'Job not found' })
      res.end()
      return
    }

    // Already finished
    if (job.status === 'done') {
      sseWrite(res, 'progress', { percent: 100, phase: 'done' })
      sseWrite(res, 'done', job.result)
      res.end()
      return
    }
    if (job.status === 'failed') {
      sseWrite(res, 'failed', { error: job.error })
      res.end()
      return
    }

    // Live stream
    const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 20000)

    const onEvent = (event, data) => {
      try { sseWrite(res, event, data) } catch {}
      if (event === 'done' || event === 'failed') {
        clearInterval(ping)
        try { res.end() } catch {}
      }
    }

    job.listeners.add(onEvent)
    req.raw.on('close', () => {
      clearInterval(ping)
      job.listeners.delete(onEvent)
    })
  })

  // GET /api/export/status/:jobId — polling fallback
  fastify.get('/status/:jobId', async (req) => {
    const { jobId } = req.params
    const job = jobs.get(jobId)

    if (!job) {
      // Check disk for files from a previous server run
      const outputs = []
      for (const ext of ['pdf', 'pptx']) {
        const p = join(EXPORTS_DIR, `${jobId}.${ext}`)
        if (existsSync(p)) outputs.push({ format: ext, downloadUrl: `/storage/exports/${jobId}.${ext}` })
      }
      return { jobId, status: outputs.length > 0 ? 'done' : 'unknown', outputs }
    }

    if (job.status === 'done')   return { jobId, status: 'done',   ...job.result }
    if (job.status === 'failed') return { jobId, status: 'failed', error: job.error }
    return { jobId, status: job.status, progress: job.progress }
  })
}
