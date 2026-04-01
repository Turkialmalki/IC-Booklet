import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { pipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import unzipper from 'unzipper'
import { listAssetFiles } from '../resolvers/assets.js'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(__dirname, '../../storage/assets')
const SHARED_DIR = join(ASSETS_DIR, 'shared')

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'])

export default async function assetsRoutes(fastify) {

  // Ensure shared folder always exists on startup
  mkdirSync(SHARED_DIR, { recursive: true })

  // POST /api/assets/upload — upload image file or ZIP of images
  fastify.post('/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const jobId    = uuidv4()
    const ext      = extname(data.filename).toLowerCase()
    const assetDir = join(ASSETS_DIR, jobId)
    mkdirSync(assetDir, { recursive: true })

    if (ext === '.zip') {
      // Flatten ZIP: extract all image files directly into assetDir regardless of
      // internal folder structure (Mac "Compress" wraps everything in a subfolder)
      let fileCount = 0
      const zip = data.file.pipe(unzipper.Parse({ forceStream: true }))
      for await (const entry of zip) {
        const entryName = basename(entry.path)
        const entryExt  = extname(entryName).toLowerCase()
        if (IMAGE_EXTS.has(entryExt) && entryName && !entryName.startsWith('.')) {
          await pipeline(entry, createWriteStream(join(assetDir, entryName)))
          fileCount++
        } else {
          entry.autodrain()
        }
      }
      return { jobId, type: 'zip', fileCount, path: `/storage/assets/${jobId}/` }
    }

    // Preserve original filename (safe-sanitised) so CSV filename lookups can match
    const origName   = basename(data.filename).replace(/[^\w.\-]/g, '_') || `file${ext}`
    const dest       = join(assetDir, origName)
    await pipeline(data.file, createWriteStream(dest))
    return { jobId, type: 'file', filename: origName, path: `/storage/assets/${jobId}/${origName}` }
  })

  // POST /api/assets/upload-shared — upload a single image directly to the shared folder
  // Files placed here are permanently available to all CSV uploads (no ZIP needed)
  fastify.post('/upload-shared', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })
    const origName = basename(data.filename).replace(/[^\w.\-]/g, '_')
    const dest = join(SHARED_DIR, origName)
    await pipeline(data.file, createWriteStream(dest))
    return { filename: origName, path: `/storage/assets/shared/${origName}` }
  })

  // GET /api/assets/index/global — list ALL image files across every job dir
  // Used by the frontend to resolve CSV filenames without a specific ZIP jobId
  fastify.get('/index/global', async (req, reply) => {
    const files = []
    if (!existsSync(ASSETS_DIR)) return { fileCount: 0, files }
    try {
      for (const jobEntry of readdirSync(ASSETS_DIR, { withFileTypes: true })) {
        if (!jobEntry.isDirectory()) continue
        const jobId    = jobEntry.name
        const jobFiles = listAssetFiles(join(ASSETS_DIR, jobId))
        for (const f of jobFiles) {
          files.push({ name: f.name, path: `/storage/assets/${jobId}/${f.name}`, size: f.size })
        }
      }
    } catch {}
    return { fileCount: files.length, files }
  })

  // GET /api/assets/:jobId/index — list image files in an uploaded ZIP job
  fastify.get('/:jobId/index', async (req, reply) => {
    const dir = join(ASSETS_DIR, req.params.jobId)
    if (!existsSync(dir)) return reply.code(404).send({ error: 'Asset job not found' })
    const files = listAssetFiles(dir)
    return { jobId: req.params.jobId, fileCount: files.length, files }
  })
}
