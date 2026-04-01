import { useState, useRef } from 'react'
import axios from 'axios'
import CropModal from './CropModal.jsx'

const PLACEHOLDER_SRC = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg=='

export default function ImagesPanel({ store }) {
  const [images,    setImages]    = useState([])   // [{ url, name }]
  const [uploading, setUploading] = useState(false)
  const [urlInput,  setUrlInput]  = useState('')
  const [error,     setError]     = useState(null)
  const [cropIdx,   setCropIdx]   = useState(null) // index of image being cropped
  const fileInputRef = useRef()

  // ── Upload ────────────────────────────────────────────────────
  async function uploadFiles(files) {
    setError(null)
    setUploading(true)
    try {
      const added = []
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const { data } = await axios.post('/api/assets/upload', form)
        added.push({ url: data.path, name: file.name })
      }
      setImages(prev => [...added, ...prev])
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  // ── URL add ───────────────────────────────────────────────────
  function addFromUrl() {
    const url = urlInput.trim()
    if (!url) return
    const img = { url, name: url.split('/').pop() || 'image' }
    setImages(prev => [img, ...prev])
    insertOnCanvas(url)
    setUrlInput('')
  }

  // ── Canvas actions ────────────────────────────────────────────
  function insertOnCanvas(url) {
    const page = store.activePage
    if (!page) return
    page.addElement({
      type: 'image', id: `img_${Date.now()}`,
      x: 100, y: 100, width: 400, height: 300, src: url,
    })
  }

  function setAsBackground(url) {
    const page = store.activePage
    if (!page) return
    const w = store.width  || 1920
    const h = store.height || 1080
    const el = page.addElement({
      type: 'image', id: `bg_${Date.now()}`,
      x: 0, y: 0, width: w, height: h, src: url,
    })
    try { el?.moveToBottom?.() } catch {}
  }

  // ── Delete ────────────────────────────────────────────────────
  function deleteImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Crop callbacks ────────────────────────────────────────────
  function onCropConfirm(croppedUrl) {
    setImages(prev => prev.map((img, i) =>
      i === cropIdx ? { ...img, url: croppedUrl } : img
    ))
    setCropIdx(null)
  }

  return (
    <>
      {/* Crop modal */}
      {cropIdx !== null && (
        <CropModal
          src={images[cropIdx].url}
          onConfirm={onCropConfirm}
          onCancel={() => setCropIdx(null)}
        />
      )}

      <div className="space-y-3">
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
        >
          {uploading ? 'Uploading…' : '+ Upload Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files.length) uploadFiles(Array.from(e.target.files)) }}
        />

        {/* URL input */}
        <div className="flex gap-1.5">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFromUrl()}
            placeholder="Paste image URL…"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={addFromUrl}
            disabled={!urlInput.trim()}
            className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 text-white rounded text-xs transition-colors"
          >
            Add
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Image grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {images.map((img, i) => (
              <div
                key={i}
                className="group relative rounded overflow-hidden bg-gray-800 border border-gray-700"
                style={{ aspectRatio: '3/2' }}
              >
                {/* Thumbnail */}
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = PLACEHOLDER_SRC }}
                />

                {/* Delete button — always visible top-right */}
                <button
                  onClick={() => deleteImage(i)}
                  title="Delete"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Action overlay — Insert / Crop / Background */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1 pt-6">
                  <button
                    onClick={() => insertOnCanvas(img.url)}
                    className="w-full text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded font-medium transition-colors"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => setCropIdx(i)}
                    className="w-full text-xs text-white bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded font-medium transition-colors"
                  >
                    Crop
                  </button>
                  <button
                    onClick={() => setAsBackground(img.url)}
                    className="w-full text-xs text-white bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded font-medium transition-colors"
                  >
                    Background
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 leading-relaxed">
            Upload images or paste a URL. Hover to <strong>Insert</strong>, <strong>Crop</strong>, or set as <strong>Background</strong>.
          </p>
        )}
      </div>
    </>
  )
}
