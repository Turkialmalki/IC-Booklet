import { createWriteStream, readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { pipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = join(__dirname, '../../storage/fonts')

export default async function fontsRoutes(fastify) {
  fastify.get('/', async () => {
    if (!existsSync(FONTS_DIR)) return { fonts: [] }
    const fonts = readdirSync(FONTS_DIR).filter(f => ['.ttf', '.otf', '.woff2'].includes(extname(f).toLowerCase()))
    return { fonts: fonts.map(f => ({ name: f, path: `/storage/fonts/${f}` })) }
  })

  fastify.post('/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })
    const ext = extname(data.filename).toLowerCase()
    if (!['.ttf', '.otf', '.woff2'].includes(ext)) {
      return reply.code(400).send({ error: 'Only .ttf, .otf, .woff2 fonts are supported' })
    }
    const filename = data.filename
    const dest = join(FONTS_DIR, filename)
    await pipeline(data.file, createWriteStream(dest))
    return { name: filename, path: `/storage/fonts/${filename}` }
  })
}
