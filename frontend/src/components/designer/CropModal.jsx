import { useEffect, useRef, useState, useCallback } from 'react'

// Clamps a value between min and max
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export default function CropModal({ src, onConfirm, onCancel }) {
  const imgRef      = useRef(null)
  const overlayRef  = useRef(null)
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 })
  const [imgDisplay, setImgDisplay] = useState({ w: 0, h: 0, x: 0, y: 0 })
  const [drag,       setDrag]       = useState(null)   // { startX, startY }
  const [selection,  setSelection]  = useState(null)   // { x, y, w, h } in display px

  // Once image loads, record natural + display dimensions
  function onImgLoad(e) {
    const img = e.target
    const rect = img.getBoundingClientRect()
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setImgDisplay({ w: rect.width, h: rect.height, x: rect.left, y: rect.top })
  }

  // Mouse helpers — coords relative to the image element
  function relCoords(e) {
    const rect = imgRef.current.getBoundingClientRect()
    return {
      x: clamp(e.clientX - rect.left, 0, rect.width),
      y: clamp(e.clientY - rect.top,  0, rect.height),
    }
  }

  function onMouseDown(e) {
    e.preventDefault()
    const { x, y } = relCoords(e)
    setDrag({ startX: x, startY: y })
    setSelection({ x, y, w: 0, h: 0 })
  }

  function onMouseMove(e) {
    if (!drag) return
    const { x, y } = relCoords(e)
    setSelection({
      x: Math.min(drag.startX, x),
      y: Math.min(drag.startY, y),
      w: Math.abs(x - drag.startX),
      h: Math.abs(y - drag.startY),
    })
  }

  function onMouseUp() {
    setDrag(null)
  }

  // Apply crop: draw onto canvas and return data URL
  function applyCrop() {
    if (!selection || selection.w < 4 || selection.h < 4) {
      // No selection — return original
      onConfirm(src)
      return
    }
    const rect    = imgRef.current.getBoundingClientRect()
    const scaleX  = imgNatural.w / rect.width
    const scaleY  = imgNatural.h / rect.height
    const sx      = selection.x * scaleX
    const sy      = selection.y * scaleY
    const sw      = selection.w * scaleX
    const sh      = selection.h * scaleY

    const canvas  = document.createElement('canvas')
    canvas.width  = Math.round(sw)
    canvas.height = Math.round(sh)
    const ctx     = canvas.getContext('2d')
    const img     = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      onConfirm(canvas.toDataURL('image/png'))
    }
    img.onerror = () => onConfirm(src)   // fallback
    img.src = src
  }

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl flex flex-col"
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Crop Image</h3>
          <p className="text-xs text-gray-400">Drag to select area, then click Apply</p>
        </div>

        {/* Image area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div className="relative select-none" style={{ cursor: 'crosshair' }}>
            <img
              ref={imgRef}
              src={src}
              alt="crop-preview"
              onLoad={onImgLoad}
              onMouseDown={onMouseDown}
              draggable={false}
              style={{
                display: 'block',
                maxWidth: '70vw',
                maxHeight: '65vh',
                userSelect: 'none',
              }}
            />

            {/* Dark overlay outside selection */}
            {selection && selection.w > 2 && selection.h > 2 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ position: 'absolute', top: 0, left: 0 }}
                width="100%"
                height="100%"
              >
                <defs>
                  <mask id="crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={selection.x} y={selection.y}
                      width={selection.w} height={selection.h}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
                {/* Selection border */}
                <rect
                  x={selection.x} y={selection.y}
                  width={selection.w} height={selection.h}
                  fill="none" stroke="white" strokeWidth="1.5"
                  strokeDasharray="6,3"
                />
                {/* Corner handles */}
                {[[0,0],[1,0],[0,1],[1,1]].map(([cx,cy]) => (
                  <rect
                    key={`${cx}${cy}`}
                    x={selection.x + cx * selection.w - 4}
                    y={selection.y + cy * selection.h - 4}
                    width={8} height={8}
                    fill="white" rx={1}
                  />
                ))}
                {/* Dimensions label */}
                {selection.w > 60 && (
                  <text
                    x={selection.x + selection.w / 2}
                    y={selection.y + selection.h / 2}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {Math.round(selection.w * (imgNatural.w / (imgRef.current?.offsetWidth || 1)))} ×{' '}
                    {Math.round(selection.h * (imgNatural.h / (imgRef.current?.offsetHeight || 1)))}
                  </text>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 gap-3">
          <button
            onClick={() => setSelection(null)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Reset selection
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyCrop}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {selection && selection.w > 4 ? 'Apply Crop' : 'Use Original'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
