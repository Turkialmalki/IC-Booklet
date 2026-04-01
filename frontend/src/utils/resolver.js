const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzlmYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i

// Client-side resolver (synchronous, for canvas preview)
// assetIndex: { filename: serverPath } where serverPath is a /storage/... URL
export function resolveImageClient(value, assetIndex = {}) {
  if (!value) return DEFAULT_PLACEHOLDER
  if (value.startsWith('data:image')) return value
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  // Server-relative paths (/storage/...) — prefix with backend base in production
  if (value.startsWith('/storage/')) return `${API_BASE}${value}`

  // Filename lookup — try exact, then lowercase
  const filename = value.split('/').pop() || value
  const match = assetIndex[filename] || assetIndex[filename.toLowerCase()]
  if (match) return match

  return DEFAULT_PLACEHOLDER
}

// Fetch the file index for a ZIP upload job.
// Pass null/undefined jobId to fetch a global index across ALL uploaded assets.
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchAssetIndex(jobId) {
  const url = jobId ? `${API_BASE}/api/assets/${jobId}/index` : `${API_BASE}/api/assets/index/global`
  try {
    const res  = await fetch(url)
    if (!res.ok) return {}
    const data = await res.json()
    const index = {}
    for (const file of data.files || []) {
      // Per-job endpoint: construct path from jobId; global endpoint: path is in file.path
      const path = jobId ? `/storage/assets/${jobId}/${file.name}` : file.path
      index[file.name]               = path
      index[file.name.toLowerCase()] = path
    }
    return index
  } catch {
    return {}
  }
}

// Detect image columns from data sample
export function detectImageColumns(columns, rows) {
  const urlPattern = /^https?:\/\//i
  return new Set(
    columns.filter((col) => {
      const samples = rows.slice(0, 20).map(r => String(r[col] || ''))
      const hits = samples.filter(v => urlPattern.test(v) || IMAGE_EXTS.test(v))
      return hits.length > samples.length * 0.3
    })
  )
}
