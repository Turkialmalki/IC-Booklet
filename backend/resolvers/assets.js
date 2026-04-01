import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Filesystem root of the /storage static directory
const STORAGE_DIR  = join(__dirname, '../../storage')
const ASSETS_DIR   = join(STORAGE_DIR, 'assets')

// ── Constants ─────────────────────────────────────────────────

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzlmYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

const MIME_MAP = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.bmp':  'image/bmp',
  '.ico':  'image/x-icon',
}

const IMAGE_EXTENSIONS = new Set(Object.keys(MIME_MAP))

function mimeFromExt(filePath) {
  return MIME_MAP[extname(filePath).toLowerCase()] || 'image/png'
}

// ── Global asset scan ─────────────────────────────────────────
// When no specific assetJobId was provided (or the file isn't in it), scan
// all uploaded asset directories for a file matching `filename`.
function findInGlobalAssets(filename) {
  if (!existsSync(ASSETS_DIR)) return null
  const lower = filename.toLowerCase()
  try {
    for (const jobEntry of readdirSync(ASSETS_DIR, { withFileTypes: true })) {
      if (!jobEntry.isDirectory()) continue
      const jobPath = join(ASSETS_DIR, jobEntry.name)
      // Direct child
      for (const candidate of [filename, lower]) {
        const p = join(jobPath, candidate)
        if (existsSync(p)) return p
      }
      // One level deep (ZIP subfolders)
      try {
        for (const sub of readdirSync(jobPath, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue
          for (const candidate of [filename, lower]) {
            const p = join(jobPath, sub.name, candidate)
            if (existsSync(p)) return p
          }
        }
      } catch {}
    }
  } catch {}
  return null
}

// ── Remote fetch with timeout ──────────────────────────────────

async function fetchRemoteImageAsBase64(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer   = await res.arrayBuffer()
    const mimeType = res.headers.get('content-type')?.split(';')[0] || mimeFromExt(url)
    return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
  } finally {
    clearTimeout(timer)
  }
}

// ── Asset index builder ───────────────────────────────────────
// Returns { filename: absolutePath, FILENAME: absolutePath } (case-insensitive keys)

export function buildAssetIndex(dir) {
  if (!dir || !existsSync(dir)) return {}
  const index = {}
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Recurse one level deep (ZIP files sometimes have a single subfolder)
        const sub = join(dir, entry.name)
        const subEntries = readdirSync(sub, { withFileTypes: true })
        for (const s of subEntries) {
          if (s.isFile() && IMAGE_EXTENSIONS.has(extname(s.name).toLowerCase())) {
            const fullPath = join(sub, s.name)
            index[s.name]            = fullPath     // exact
            index[s.name.toLowerCase()] = fullPath  // lower
          }
        }
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        const fullPath = join(dir, entry.name)
        index[entry.name]                = fullPath
        index[entry.name.toLowerCase()]  = fullPath
      }
    }
  } catch {}
  return index
}

// ── List files in an asset job dir (for API endpoint) ─────────

export function listAssetFiles(dir) {
  if (!dir || !existsSync(dir)) return []
  const files = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sub = join(dir, entry.name)
        readdirSync(sub, { withFileTypes: true })
          .filter(s => s.isFile() && IMAGE_EXTENSIONS.has(extname(s.name).toLowerCase()))
          .forEach(s => files.push({ name: s.name, size: statSync(join(sub, s.name)).size }))
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push({ name: entry.name, size: statSync(join(dir, entry.name)).size })
      }
    }
  } catch {}
  return files
}

// ── Main resolver ─────────────────────────────────────────────

export async function resolveImage(value, assetIndex = {}) {
  if (!value) return DEFAULT_PLACEHOLDER

  // Already embedded
  if (value.startsWith('data:image')) return value

  // Remote URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try { return await fetchRemoteImageAsBase64(value) }
    catch { return DEFAULT_PLACEHOLDER }
  }

  // Server-relative path stored by the upload API (e.g. /storage/assets/UUID/file.jpg)
  if (value.startsWith('/storage/')) {
    const fsPath = join(STORAGE_DIR, value.slice('/storage'.length))
    if (existsSync(fsPath)) {
      const buf  = readFileSync(fsPath)
      const mime = mimeFromExt(fsPath)
      return `data:${mime};base64,${buf.toString('base64')}`
    }
    return DEFAULT_PLACEHOLDER
  }

  // Filename lookup — try exact then lowercase in the provided per-job index
  const filename = basename(value)
  const match = assetIndex[filename] || assetIndex[filename.toLowerCase()]
  if (match && existsSync(match)) {
    const buf  = readFileSync(match)
    const mime = mimeFromExt(match)
    return `data:${mime};base64,${buf.toString('base64')}`
  }

  // Global fallback — scan all uploaded asset directories by filename
  // (handles individual uploads and cases where assetJobId is not provided)
  const globalPath = findInGlobalAssets(filename)
  if (globalPath) {
    const buf  = readFileSync(globalPath)
    const mime = mimeFromExt(globalPath)
    return `data:${mime};base64,${buf.toString('base64')}`
  }

  return DEFAULT_PLACEHOLDER
}
