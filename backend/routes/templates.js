import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '../../storage/templates')

function getTemplates() {
  if (!existsSync(TEMPLATES_DIR)) return []
  return readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(readFileSync(join(TEMPLATES_DIR, f), 'utf-8')) }
      catch { return null }
    })
    .filter(Boolean)
}

export default async function templatesRoutes(fastify) {
  fastify.get('/', async () => ({ templates: getTemplates() }))

  fastify.get('/:id', async (req, reply) => {
    const file = join(TEMPLATES_DIR, `${req.params.id}.json`)
    if (!existsSync(file)) return reply.code(404).send({ error: 'Template not found' })
    return JSON.parse(readFileSync(file, 'utf-8'))
  })

  fastify.post('/', async (req, reply) => {
    const id = `tpl_${uuidv4().slice(0, 8)}`
    const now = new Date().toISOString()
    const body = req.body || {}
    const template = {
      id,
      name: body.name || 'Untitled Template',
      thumbnail: body.thumbnail || null,
      createdAt: now,
      updatedAt: now,
      textStyles: body.textStyles || {
        title:    { font: '29LTAzer', size: 48, color: '#1A1A2E', weight: 'bold', rtl: false },
        subtitle: { font: '29LTAzer', size: 28, color: '#4A4A6A', weight: 'regular' },
        body:     { font: '29LTAzer', size: 16, color: '#333333' },
        caption:  { font: '29LTAzer', size: 12, color: '#888888' },
        tag:      { font: '29LTAzer', size: 14, color: '#FFFFFF', background: '#E94560' },
      },
      fonts: body.fonts || ['29LTAzer'],
      pages: body.pages || [],
      bindings: body.bindings || {},
      componentLibrary: body.componentLibrary || [],
    }
    writeFileSync(join(TEMPLATES_DIR, `${id}.json`), JSON.stringify(template, null, 2))
    return reply.code(201).send(template)
  })

  fastify.put('/:id', async (req, reply) => {
    const file = join(TEMPLATES_DIR, `${req.params.id}.json`)
    if (!existsSync(file)) return reply.code(404).send({ error: 'Template not found' })
    const existing = JSON.parse(readFileSync(file, 'utf-8'))
    const updated = { ...existing, ...req.body, id: existing.id, updatedAt: new Date().toISOString() }
    writeFileSync(file, JSON.stringify(updated, null, 2))
    return updated
  })

  fastify.delete('/:id', async (req, reply) => {
    const file = join(TEMPLATES_DIR, `${req.params.id}.json`)
    if (!existsSync(file)) return reply.code(404).send({ error: 'Template not found' })
    unlinkSync(file)
    return { success: true }
  })
}
