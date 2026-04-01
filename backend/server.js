import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import multipart from '@fastify/multipart'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

import templatesRoutes from './routes/templates.js'
import assetsRoutes from './routes/assets.js'
import exportRoutes from './routes/export.js'
import previewRoutes from './routes/preview.js'
import fontsRoutes from './routes/fonts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORAGE_PATH = join(__dirname, '../storage')

// Ensure storage folders exist
for (const dir of ['templates', 'assets', 'exports', 'fonts', 'thumbnails']) {
  mkdirSync(join(STORAGE_PATH, dir), { recursive: true })
}

const fastify = Fastify({ logger: true })

await fastify.register(cors, { origin: true })
await fastify.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } })
await fastify.register(staticPlugin, {
  root: STORAGE_PATH,
  prefix: '/storage/',
})

await fastify.register(templatesRoutes, { prefix: '/api/templates' })
await fastify.register(assetsRoutes, { prefix: '/api/assets' })
await fastify.register(exportRoutes, { prefix: '/api/export' })
await fastify.register(previewRoutes, { prefix: '/api/preview' })
await fastify.register(fontsRoutes, { prefix: '/api/fonts' })

fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

try {
  const port = parseInt(process.env.PORT || '4000')
  await fastify.listen({ port, host: '0.0.0.0' })
  console.log(`TemplateForge backend running on port ${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
