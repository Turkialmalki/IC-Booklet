import { useState } from 'react'

export default function PlaceholderPanel({ store, template, onTemplateChange }) {
  const [newColumn,    setNewColumn]    = useState('')
  const [newType,      setNewType]      = useState('text')
  // Image binding options
  const [imgFrame,     setImgFrame]     = useState('rect')
  const [imgFit,       setImgFit]       = useState('cover')
  const [isBg,         setIsBg]         = useState(false)
  const [isLogoFlag,   setIsLogoFlag]   = useState(false)
  // Text binding options
  const [shrinkOflow,  setShrinkOflow]  = useState(true)

  const bindings = template?.bindings || {}

  function addBinding() {
    if (!newColumn.trim()) return
    const col = newColumn.trim().toLowerCase().replace(/\s+/g, '_')

    const page = store.activePage
    if (page) {
      const id = `el_${Date.now()}`
      const isImage = newType === 'image'

      const elDef = isImage
        ? {
            type: 'image',
            x: 100, y: 100,
            width: 300, height: 200,
            keepRatio: false,
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==',
            id,
          }
        : {
            type: 'text',
            x: 100, y: 100,
            width: 400, height: 150,
            text: `{{${col}}}`,
            fontSize: 24,
            fill: '#333333',
            id,
          }

      page.addElement(elDef)

      const bindingExtra = isImage
        ? {
            imageFit: imgFit,
            imageFrame: imgFrame,
            isBackground: isBg,
            isLogo: isLogoFlag,
          }
        : {
            shrinkOnOverflow: shrinkOflow,
            minFontSize: 18,
            resizeToFit: false,
          }

      const updatedBindings = {
        ...bindings,
        [id]: { property: isImage ? 'src' : 'text', column: col, ...bindingExtra },
      }
      onTemplateChange?.({ ...template, bindings: updatedBindings })
    }

    setNewColumn('')
    setImgFrame('rect')
    setImgFit('cover')
    setIsBg(false)
    setIsLogoFlag(false)
    setShrinkOflow(true)
  }

  function removeBinding(elementId) {
    const updated = { ...bindings }
    delete updated[elementId]
    onTemplateChange?.({ ...template, bindings: updated })
  }

  function updateBinding(elementId, changes) {
    const updated = {
      ...bindings,
      [elementId]: { ...bindings[elementId], ...changes },
    }
    onTemplateChange?.({ ...template, bindings: updated })
  }

  const isImage = newType === 'image'

  return (
    <div className="space-y-3">
      {/* Existing bindings */}
      {Object.entries(bindings).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 mb-1">Bound columns</p>
          {Object.entries(bindings).map(([elId, binding]) => (
            <div key={elId} className="flex flex-col bg-gray-700/50 rounded px-2 py-1.5 gap-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-blue-300 font-mono">{`{{${binding.column}}}`}</span>
                  <span className="text-xs text-gray-500 ml-1">({binding.property})</span>
                  {binding.isLogo && (
                    <span className="ml-1 text-xs bg-yellow-900/50 text-yellow-300 px-1 rounded">logo</span>
                  )}
                  {binding.isBackground && (
                    <span className="ml-1 text-xs bg-purple-900/50 text-purple-300 px-1 rounded">bg</span>
                  )}
                  {binding.imageFrame && binding.imageFrame !== 'rect' && (
                    <span className="ml-1 text-xs bg-gray-600/80 text-gray-300 px-1 rounded">{binding.imageFrame}</span>
                  )}
                </div>
                <button onClick={() => removeBinding(elId)} className="text-gray-500 hover:text-red-400 shrink-0 ml-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image fit toggle for existing bindings */}
              {binding.property === 'src' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Fit:</span>
                  <div className="flex gap-1">
                    {[
                      { value: 'cover',   label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateBinding(elId, { imageFit: value })}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          (binding.imageFit || 'cover') === value
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Add placeholder</p>
        <input
          value={newColumn}
          onChange={(e) => setNewColumn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addBinding()}
          placeholder="column_name"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-300 outline-none"
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>

        {/* Image-specific options */}
        {isImage && (
          <div className="space-y-2 pt-1 border-t border-gray-700">
            <p className="text-xs text-gray-500">Image options</p>

            {/* Image fit mode */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Fit mode</span>
              <div className="flex gap-1">
                {[
                  { value: 'cover',   label: 'Cover (fill)' },
                  { value: 'contain', label: 'Contain (fit)' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setImgFit(value)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      imgFit === value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame shape */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Frame</span>
              <select
                value={imgFrame}
                onChange={(e) => setImgFrame(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 outline-none"
              >
                <option value="rect">Rectangle</option>
                <option value="rounded">Rounded (8px)</option>
                <option value="hex">Hexagon</option>
              </select>
            </div>

            {/* Is background toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBg}
                onChange={(e) => { setIsBg(e.target.checked); if (e.target.checked) setIsLogoFlag(false) }}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <span className="text-xs text-gray-400">Full-bleed background + scrim</span>
            </label>

            {/* Is logo toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLogoFlag}
                onChange={(e) => { setIsLogoFlag(e.target.checked); if (e.target.checked) setIsBg(false) }}
                className="rounded border-gray-600 bg-gray-700 text-yellow-500"
              />
              <span className="text-xs text-gray-400">Logo (pin corner, remove white bg)</span>
            </label>
          </div>
        )}

        {/* Text-specific options */}
        {!isImage && (
          <div className="space-y-2 pt-1 border-t border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shrinkOflow}
                onChange={(e) => setShrinkOflow(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <span className="text-xs text-gray-400">Shrink text on overflow (min 18pt)</span>
            </label>
          </div>
        )}

        <button
          onClick={addBinding}
          disabled={!newColumn.trim()}
          className="w-full py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded transition-colors"
        >
          Add to Canvas
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Placeholders will be filled with row data at export time.
      </p>
    </div>
  )
}
