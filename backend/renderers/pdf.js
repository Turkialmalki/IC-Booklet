import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = join(__dirname, '../../storage/fonts')

// Build @font-face CSS for 29LTAzer from local TTF files.
// Falls back to empty string if the font files aren't present.
function getLocalFontCss() {
  const weights = [
    { file: '29LTAzer-Thin.ttf',       weight: 100 },
    { file: '29LTAzer-ExtraLight.ttf', weight: 200 },
    { file: '29LTAzer-Light.ttf',      weight: 300 },
    { file: '29LTAzer-Regular.ttf',    weight: 400 },
    { file: '29LTAzer-Medium.ttf',     weight: 500 },
    { file: '29LTAzer-Bold.ttf',       weight: 700 },
    { file: '29LTAzer-Black.ttf',      weight: 900 },
  ]
  return weights
    .filter(({ file }) => existsSync(join(FONTS_DIR, file)))
    .map(({ file, weight }) => {
      const b64 = readFileSync(join(FONTS_DIR, file)).toString('base64')
      return `@font-face{font-family:'29LTAzer';src:url('data:font/truetype;base64,${b64}') format('truetype');font-weight:${weight};font-style:normal;}`
    })
    .join('\n')
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Estimate how many lines a piece of text needs at a given font size within
// a container of containerWidth pixels. Uses an average character-width ratio.
function estimateLineCount(text, containerWidth, fontSize) {
  if (!text || !containerWidth || !fontSize) return 1
  const charsPerLine = Math.max(1, containerWidth / (fontSize * 0.55))
  return text.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil((line.length || 1) / charsPerLine))
  }, 0)
}

function elementToHtml(el, textStyles) {
  const x = el.x || 0
  const y = el.y || 0
  const w = el.width || 0
  const h = el.height || 0
  const rotation = el.rotation || 0
  const opacity = el.opacity !== undefined ? el.opacity : 1

  // Absolute positioning without overflow — applied selectively per element type
  const pos = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
    (rotation ? `transform:rotate(${rotation}deg);transform-origin:center;` : '') +
    `opacity:${opacity};`

  // base adds overflow:hidden for shapes/fallback (not for text or images)
  const base = pos + 'overflow:hidden;'

  if (el.type === 'text') {
    const ref = el.styleRef ? textStyles?.[el.styleRef] : null
    const fontFamily = el.fontFamily || ref?.font || 'Inter'
    const baseFontSize = el.fontSize || ref?.size || 16
    const color      = el.fill      || ref?.color || '#000000'
    // fontWeight may be a number (700) or a string ('bold'/'normal')
    const fw = el.fontWeight ?? ref?.weight ?? 'normal'
    const fontWeight = (fw === 'bold') ? 700 : (fw === 'normal') ? 400 : Number(fw) || 400
    // RTL: explicit binding flag, element align, or style ref
    const rtl        = !!el.rtl || el.align === 'right' || !!ref?.rtl
    const align      = rtl ? 'right' : (el.align || 'left')
    const lineHeight = el.lineHeight || 1.4
    const minFs      = el.minFontSize || 6

    // Auto-shrink: if the text would overflow the element's height, reduce
    // font size until it fits (or reaches minFs floor). This prevents text
    // from spilling past the canvas boundary and being clipped.
    let fontSize = baseFontSize
    if (h > 0 && el.text) {
      let fs = baseFontSize
      while (fs > minFs) {
        const lines = estimateLineCount(el.text, w || 400, fs)
        if (lines * fs * lineHeight <= h) break
        fs--
      }
      fontSize = Math.max(fs, minFs)
    }

    // Use min-height (not height) so the box can grow if estimation was off,
    // ensuring wrapped lines are never visually clipped by the element itself.
    const textPos = `position:absolute;left:${x}px;top:${y}px;width:${w}px;min-height:${h}px;` +
      (rotation ? `transform:rotate(${rotation}deg);transform-origin:center;` : '') +
      `opacity:${opacity};`

    return `<div style="${textPos}font-family:'${fontFamily}',sans-serif;font-size:${fontSize}px;` +
      `color:${color};font-weight:${fontWeight};text-align:${align};` +
      `direction:${rtl ? 'rtl' : 'ltr'};line-height:${lineHeight};` +
      `word-break:break-word;white-space:pre-wrap;">` +
      `${escapeHtml(el.text || '')}</div>`
  }

  if (el.type === 'image') {
    const src = el.src || ''
    if (!src) return `<div style="${base}background:#f3f4f6;border-radius:4px;"></div>`

    const fit    = el.imageFit   || 'cover'
    const frame  = el.imageFrame || 'rect'
    const isLogo = !!el.isLogo
    const isBg   = !!el.isBackground

    // Apply clip/shape directly on the outer (positioned) div so transparent
    // PNG corners and any canvas background are fully hidden — no shadow so
    // there is no visible "card" frame around the image.
    let clipStyle = 'overflow:hidden;'
    if (frame === 'rounded') {
      clipStyle += 'border-radius:8px;'
    } else if (frame === 'hex') {
      clipStyle += 'clip-path:polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%);'
    }

    // Logo: multiply blend removes white background halos on PNG logos
    const blend  = isLogo ? 'mix-blend-mode:multiply;' : ''

    const imgStyle = `width:100%;height:100%;object-fit:${fit};object-position:center;display:block;${blend}`

    // Single container div handles both positioning and clipping.
    // Inner relative div is kept for scrim overlay positioning.
    let html = `<div style="${pos}${clipStyle}">`
    html += `<div style="position:relative;width:100%;height:100%;">`
    html += `<img src="${src}" style="${imgStyle}" />`
    // Scrim overlay for full-bleed background images (text must render above this)
    if (isBg) {
      html += `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>`
    }
    html += `</div></div>`
    return html
  }

  if (el.type === 'figure' || el.type === 'rect' || el.type === 'line') {
    const fill   = el.fill || '#cccccc'
    const radius = el.cornerRadius || 0
    const border = el.stroke ? `border:${el.strokeWidth || 1}px solid ${el.stroke};` : ''
    const sub    = el.subType || ''
    if (sub === 'ellipse' || sub === 'circle') {
      return `<div style="${base}background:${fill};border-radius:50%;${border}"></div>`
    }
    if (sub === 'triangle') {
      return `<div style="${base}"><div style="width:100%;height:100%;background:${fill};clip-path:polygon(50% 0%,100% 100%,0% 100%);"></div></div>`
    }
    if (sub === 'star') {
      return `<div style="${base}display:flex;align-items:center;justify-content:center;font-size:${Math.min(w,h)*0.8}px;line-height:1;">⭐</div>`
    }
    if (sub === 'arrow') {
      return `<div style="${base}background:${fill};clip-path:polygon(0 30%,60% 30%,60% 0%,100% 50%,60% 100%,60% 70%,0 70%);"></div>`
    }
    return `<div style="${base}background:${fill};border-radius:${radius}px;${border}"></div>`
  }

  if (el.type === 'svg') {
    return `<div style="${base}"><img src="${el.src}" style="width:100%;height:100%;" /></div>`
  }

  return ''
}

function parseDim(v, fallback) {
  const n = parseInt(v, 10)
  return n > 0 ? n : fallback
}

// Cached font CSS — built once per process (fonts don't change at runtime)
let _fontCss = null
function getFontCss() {
  if (_fontCss === null) _fontCss = getLocalFontCss()
  return _fontCss
}

function buildPageHtml(pageJson, textStyles = {}) {
  const width  = parseDim(pageJson.width,  1920)
  const height = parseDim(pageJson.height, 1080)
  const bg     = pageJson.background || '#ffffff'

  const elements = (pageJson.children || []).map(el => elementToHtml(el, textStyles)).join('\n')

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
${getFontCss()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${width}px;height:${height * 2}px;overflow:visible;margin:0;padding:0}
.canvas{position:relative;width:${width}px;height:${height}px;overflow:visible;background:${bg}}
</style>
</head><body>
<div class="canvas">
${elements}
</div>
</body></html>`
}

// Singleton browser — launched once per server process
let _browser = null

async function getBrowser() {
  // Relaunch if browser is gone or has disconnected (e.g. after OOM crash)
  if (!_browser || !_browser.isConnected()) {
    if (_browser) { try { await _browser.close() } catch {} }
    const launchOpts = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    }
    _browser = await puppeteer.launch(launchOpts)
  }
  return _browser
}

export async function closeBrowser() {
  if (_browser) { try { await _browser.close() } catch {} _browser = null }
}

// Render one page to a PNG buffer
export async function renderPageToPng(pageJson, textStyles = {}) {
  const html    = buildPageHtml(pageJson, textStyles)
  const width   = parseDim(pageJson.width,  1920)
  const height  = parseDim(pageJson.height, 1080)

  // Attempt the render; on first failure reset the browser and retry once
  for (let attempt = 0; attempt < 2; attempt++) {
    const browser = await getBrowser()
    const tab = await browser.newPage()
    try {
      // Use a taller viewport so text that overflows an element's designated
      // height can still render fully within canvas bounds. Clip the screenshot
      // back to exact canvas dimensions so the output size is always correct.
      await tab.setViewport({ width, height: height * 2, deviceScaleFactor: 1 })
      await tab.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
      // Force a layout/paint flush so all CSS (fonts, object-fit) is applied
      // before the screenshot is taken. requestAnimationFrame fires after paint.
      await tab.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
      // Puppeteer v22+ returns Uint8Array; normalise to Buffer
      const raw = await tab.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } })
      return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
    } catch (err) {
      if (attempt === 0) {
        // Browser likely crashed — reset and retry with a fresh browser
        console.warn('[renderer] Puppeteer error on attempt 1, resetting browser:', err?.message)
        _browser = null
      } else {
        throw err
      }
    } finally {
      // Always close the tab (on success, finally runs after return)
      await tab.close().catch(() => {})
    }
  }
}

// Render an ordered array of page JSONs → single merged PDF buffer.
// Uses PNG screenshots (not tab.pdf) because Chromium's print engine drops
// position:absolute children — screenshots reliably capture all elements.
export async function renderPagesToPdf(pageJsonArray, textStyles = {}) {
  const doc = await PDFDocument.create()

  for (const pageJson of pageJsonArray) {
    const width  = parseDim(pageJson.width,  1920)
    const height = parseDim(pageJson.height, 1080)

    const pngBuf = await renderPageToPng(pageJson, textStyles)
    const img    = await doc.embedPng(pngBuf)
    const page   = doc.addPage([width, height])
    page.drawImage(img, { x: 0, y: 0, width, height })
  }

  return Buffer.from(await doc.save())
}
