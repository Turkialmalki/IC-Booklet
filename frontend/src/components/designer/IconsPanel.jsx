import { useState } from 'react'
import axios from 'axios'

export default function IconsPanel({ store }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  async function searchIcons() {
    if (!query.trim()) return
    try {
      setLoading(true)
      const res = await axios.get(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=48`)
      setResults(res.data?.icons || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function insertIcon(iconName) {
    try {
      const [prefix, name] = iconName.split(':')
      const res = await axios.get(`https://api.iconify.design/${prefix}/${name}.svg`)
      const svgContent = res.data
      const page = store.activePage
      if (!page) return
      page.addElement({
        type: 'svg',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        src: `data:image/svg+xml;base64,${btoa(svgContent)}`,
        id: `icon_${Date.now()}`,
      })
    } catch {
      console.error('Failed to insert icon')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchIcons()}
          placeholder="Search icons…"
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
        />
        <button
          onClick={searchIcons}
          disabled={loading}
          className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-6 gap-1">
          {results.map((icon) => (
            <button
              key={icon}
              onClick={() => insertIcon(icon)}
              title={icon}
              className="aspect-square p-1.5 bg-gray-700/50 hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
            >
              <img
                src={`https://api.iconify.design/${icon.replace(':', '/')}.svg?color=white&width=20&height=20`}
                alt={icon}
                className="w-5 h-5"
                loading="lazy"
                onError={e => { e.target.style.opacity = '0.2' }}
              />
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <p className="text-xs text-gray-500 text-center py-4">No icons found</p>
      )}

      {!query && (
        <p className="text-xs text-gray-500 leading-relaxed">
          Search from thousands of icons powered by Iconify. Click to insert onto canvas.
        </p>
      )}
    </div>
  )
}
