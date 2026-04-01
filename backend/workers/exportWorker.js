import { Worker } from 'bullmq'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { connection } from '../queue.js'
import { renderPagesToPdf } from '../renderers/pdf.js'
import { renderToPptx } from '../renderers/pptx.js'
import { resolveImage, buildAssetIndex } from '../resolvers/assets.js'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const TMPL_DIR    = join(__dirname, '../../storage/templates')
const ASSETS_DIR  = join(__dirname, '../../storage/assets')
const EXPORTS_DIR = join(__dirname, '../../storage/exports')

mkdirSync(EXPORTS_DIR, { recursive: true })

// ── Helpers ────────────────────────────────────────────────────

function interpolate(text, rowData, columnBindings) {
  if (!text || !text.includes('{{')) return text
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const col = columnBindings?.[key] || key
    const val = rowData?.[col]
    return (val !== undefined && val !== null) ? String(val) : match
  })
}

function mergePageData(pageJson, rowData, bindings, columnBindings) {
  const merged = JSON.parse(JSON.stringify(pageJson))
  if (!merged.children) return merged
  for (const el of merged.children) {
    // Explicit binding (registered via PlaceholderPanel)
    const binding = bindings?.[el.id]
    if (binding) {
      const col   = columnBindings?.[binding.column] || binding.column
      const value = rowData?.[col]
      if (value !== undefined && value !== null && value !== '') {
        if (binding.property === 'text') el.text = String(value)
        else if (binding.property === 'src') el.src = String(value)
      }
    }
    // Template-string interpolation for {{var}} typed directly in text boxes
    if (el.type === 'text' && el.text?.includes('{{')) {
      el.text = interpolate(el.text, rowData, columnBindings)
    }
  }
  return merged
}

async function resolvePageImages(pageJson, assetIndex) {
  for (const el of pageJson.children || []) {
    if (el.type === 'image' && el.src) {
      el.src = await resolveImage(el.src, assetIndex)
    }
  }
  return pageJson
}

function getAssetIndex(assetJobId) {
  if (!assetJobId) return {}
  return buildAssetIndex(join(ASSETS_DIR, assetJobId))
}

function rowLabel(row, index) {
  const firstValue = Object.values(row || {})[0]
  return (firstValue && typeof firstValue === 'string') ? firstValue : `Row ${index + 1}`
}

// ── Worker ─────────────────────────────────────────────────────

const exportWorker = new Worker('templateforge-export', async (job) => {
  const {
    jobId,
    templateId,
    format         = 'pdf',
    rows           = [],
    columnBindings = {},
    exportMeta     = {},
    assetJobId,
    outputFilename = 'export',
  } = job.data

  // Load template
  const tmplFile = join(TMPL_DIR, `${templateId}.json`)
  if (!existsSync(tmplFile)) throw new Error(`Template not found: ${templateId}`)
  const template   = JSON.parse(readFileSync(tmplFile, 'utf-8'))
  const textStyles = template.textStyles || {}
  const bindings   = template.bindings   || {}
  const assetIndex = getAssetIndex(assetJobId)

  const coverBase = template.pages?.find(p => p.role === 'cover')?.polotnoJson || null
  const slideBase = template.pages?.find(p => p.role === 'slide')?.polotnoJson || null
  const backBase  = template.pages?.find(p => p.role === 'back')?.polotnoJson  || null

  const totalPages = (coverBase ? 1 : 0) + rows.length + (backBase ? 1 : 0)
  let current = 0

  const report = async (phase, currentRowName = '') => {
    current++
    const percent = Math.round((current / totalPages) * 100)
    await job.updateProgress({ current, total: totalPages, percent, phase, currentRowName })
  }

  const allPages = []

  // Cover
  if (coverBase) {
    await report('cover', 'Cover page')
    const p = mergePageData(coverBase, exportMeta, bindings, {})
    await resolvePageImages(p, assetIndex)
    allPages.push(p)
  }

  // Slides
  if (slideBase) {
    for (let i = 0; i < rows.length; i++) {
      const row  = rows[i]
      const name = rowLabel(row, i)
      await report('slide', name)
      const p = mergePageData(slideBase, row, bindings, columnBindings)
      await resolvePageImages(p, assetIndex)
      allPages.push(p)
    }
  }

  // Back
  if (backBase) {
    await report('back', 'Back page')
    const p = mergePageData(backBase, exportMeta, bindings, {})
    await resolvePageImages(p, assetIndex)
    allPages.push(p)
  }

  if (allPages.length === 0) throw new Error('No pages to render. Design at least one page in the editor.')

  const outputs = []

  if (format === 'pdf' || format === 'both') {
    const buf      = await renderPagesToPdf(allPages, textStyles)
    const filePath = join(EXPORTS_DIR, `${jobId}.pdf`)
    writeFileSync(filePath, buf)
    outputs.push({ format: 'pdf', filename: `${outputFilename}.pdf`, downloadUrl: `/storage/exports/${jobId}.pdf` })
  }

  if (format === 'pptx' || format === 'both') {
    const buf      = await renderToPptx(allPages, textStyles)
    const filePath = join(EXPORTS_DIR, `${jobId}.pptx`)
    writeFileSync(filePath, buf)
    outputs.push({ format: 'pptx', filename: `${outputFilename}.pptx`, downloadUrl: `/storage/exports/${jobId}.pptx` })
  }

  return { jobId, status: 'done', outputs, rowCount: rows.length }

}, { connection, concurrency: 2 })

exportWorker.on('failed', (job, err) => {
  console.error(`[export worker] Job ${job?.id} failed:`, err.message)
})

exportWorker.on('completed', (job) => {
  console.log(`[export worker] Job ${job?.id} completed`)
})

export default exportWorker
