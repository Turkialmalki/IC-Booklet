import { renderPageToPng } from '../renderers/pdf.js'
import { resolveImage } from '../resolvers/assets.js'

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
    const binding = bindings?.[el.id]
    if (binding) {
      const actualCol = columnBindings?.[binding.column] || binding.column
      const value = rowData?.[actualCol]
      if (value !== undefined && value !== null && value !== '') {
        if (binding.property === 'text') el.text = String(value)
        else if (binding.property === 'src') el.src = String(value)
      }
    }
    if (el.type === 'text' && el.text?.includes('{{')) {
      el.text = interpolate(el.text, rowData, columnBindings)
    }
  }
  return merged
}

export default async function previewRoutes(fastify) {
  fastify.post('/render', async (req, reply) => {
    const { pageJson, rowData, bindings, columnBindings, textStyles } = req.body || {}
    if (!pageJson) return reply.code(400).send({ error: 'pageJson is required' })

    try {
      const merged = mergePageData(pageJson, rowData || {}, bindings || {}, columnBindings || {})

      // Resolve remote/local images to base64 so Puppeteer can embed them
      for (const el of merged.children || []) {
        if (el.type === 'image' && el.src && el.src.startsWith('http')) {
          el.src = await resolveImage(el.src)
        }
      }

      const pngBuf = await renderPageToPng(merged, textStyles || {})
      return { imageUrl: `data:image/png;base64,${pngBuf.toString('base64')}` }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: err.message })
    }
  })
}
