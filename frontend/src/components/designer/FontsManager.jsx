import { useState, useEffect } from 'react'
import api from '../../utils/api.js'

// Pre-load 29LT Azer weights so the font preview renders correctly
const AZER_FILES = ['Thin','ExtraLight','Light','Regular','Medium','Bold','Black']
AZER_FILES.forEach(w => {
  const ff = new FontFace('29LTAzer', `url(/src/assets/fonts/29LTAzer-${w}.ttf)`)
  ff.load().then(f => document.fonts.add(f)).catch(() => {})
})

export default function FontsManager({ store, template, onTemplateChange }) {
  const [fonts, setFonts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFonts()
  }, [])

  async function fetchFonts() {
    try {
      const { data } = await api.get('/api/fonts')
      setFonts(data.fonts || [])
    } catch {}
  }

  async function uploadFont(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setError(null)
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/fonts/upload', form)

      // Register font with Polotno
      const fontName = file.name.replace(/\.(ttf|otf|woff2)$/i, '')
      const url = window.location.origin + data.path

      if (store.addFont) {
        store.addFont({ fontFamily: fontName, url })
      }

      // Update template fonts list
      const updatedFonts = [...new Set([...(template?.fonts || []), fontName])]
      onTemplateChange?.({ ...template, fonts: updatedFonts })

      await fetchFonts()
    } catch {
      setError('Upload failed. Supported: .ttf .otf .woff2')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const systemFonts = ['29LTAzer', 'Inter']
  const allFonts = [...systemFonts, ...fonts.map(f => f.name.replace(/\.(ttf|otf|woff2)$/i, ''))]

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Active fonts</p>
        <div className="space-y-1">
          {allFonts.map((font) => (
            <div key={font} className="flex items-center justify-between bg-gray-700/50 rounded px-2 py-1.5">
              <span className="text-xs text-gray-300" style={{ fontFamily: font }}>{font}</span>
              {!systemFonts.includes(font) && (
                <span className="text-xs text-green-400">custom</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Upload font</p>
        <label className={`flex flex-col items-center justify-center w-full py-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          uploading ? 'border-blue-500 bg-blue-900/10' : 'border-gray-600 hover:border-gray-400'
        }`}>
          {uploading ? (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs text-gray-400">.ttf .otf .woff2</span>
            </>
          )}
          <input type="file" accept=".ttf,.otf,.woff2" className="hidden" onChange={uploadFont} disabled={uploading} />
        </label>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  )
}
