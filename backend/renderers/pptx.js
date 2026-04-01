import pptxgen from 'pptxgenjs'
import { renderPageToPng } from './pdf.js'

// Canvas → slide coordinate conversion.
// pptxgenjs LAYOUT_WIDE = 13.33" × 7.5" (modern widescreen default).
const SLIDE_W_IN = 13.33
const SLIDE_H_IN = 7.5

// Render each page as a full-resolution PNG via Puppeteer, then embed as a
// full-slide image. Page numbers are already baked into the PNG by
// injectSlideNumbers, so no separate native PPTX text box is added.
//
// pageJsonArray  — array of polotnoJson objects (already merged, already has
//                  __pagenum_N elements injected by injectSlideNumbers)
// textStyles     — template.textStyles (passed through to Puppeteer renderer)
export async function renderToPptx(pageJsonArray, textStyles = {}) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 in, 16:9 widescreen

  for (let idx = 0; idx < pageJsonArray.length; idx++) {
    const pageJson = pageJsonArray[idx]
    const slide    = pptx.addSlide()

    // Full-slide PNG carries all visual elements including the page number
    // text element already injected by injectSlideNumbers — no native text
    // box overlay needed (which previously caused duplicate numbers).
    const pngBuf = await renderPageToPng(pageJson, textStyles)
    const base64 = (Buffer.isBuffer(pngBuf) ? pngBuf : Buffer.from(pngBuf)).toString('base64')
    // pptxgenjs v3 requires the full data URI scheme: "data:image/png;base64,<data>"
    slide.addImage({ data: 'data:image/png;base64,' + base64, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN })
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
}
