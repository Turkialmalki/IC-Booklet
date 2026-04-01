import { useState } from 'react'

const DEFAULT_STYLES = {
  title:    { font: '29LTAzer', size: 48, color: '#1A1A2E', weight: 'bold',    rtl: false },
  subtitle: { font: '29LTAzer', size: 28, color: '#4A4A6A', weight: 'regular', rtl: false },
  body:     { font: '29LTAzer', size: 16, color: '#333333', weight: 'regular', rtl: false },
  caption:  { font: '29LTAzer', size: 12, color: '#888888', weight: 'regular', rtl: false },
  tag:      { font: '29LTAzer', size: 14, color: '#FFFFFF', weight: 'bold',    rtl: false, background: '#E94560' },
}

export default function TextStylesPanel({ store, template, onTemplateChange }) {
  const [openStyles, setOpenStyles] = useState(() => new Set())
  function toggleStyle(name) {
    setOpenStyles(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }
  // Migrate any legacy "Cairo" / "Noto Sans Arabic" references to 29LTAzer
  const rawStyles = template?.textStyles || DEFAULT_STYLES
  const textStyles = Object.fromEntries(
    Object.entries(rawStyles).map(([k, v]) => [
      k,
      { ...v, font: (v.font === 'Cairo' || v.font === 'Noto Sans Arabic') ? '29LTAzer' : v.font },
    ])
  )

  function applyStyle(styleName) {
    const style = textStyles[styleName]
    if (!style) return
    const selected = store.selectedElements
    if (!selected?.length) return
    for (const el of selected) {
      if (el.type !== 'text') continue
      el.set({
        fontFamily: style.font,
        fontSize: style.size,
        fill: style.color,
        fontWeight: style.weight === 'bold' ? 'bold' : 'normal',
        align: style.rtl ? 'right' : 'left',
      })
    }
  }

  function updateStyle(styleName, field, value) {
    const updated = {
      ...textStyles,
      [styleName]: { ...textStyles[styleName], [field]: field === 'size' ? Number(value) : value },
    }
    onTemplateChange?.({ ...template, textStyles: updated })
  }

  return (
    <div className="space-y-2">
      {Object.entries(textStyles).map(([name, style]) => (
        <div key={name} className="bg-gray-700/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <span
                className="text-sm font-medium"
                style={{ fontFamily: style.font, color: style.color, fontWeight: style.weight === 'bold' ? 'bold' : 'normal' }}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
              <span className="text-xs text-gray-500 ml-2">{style.font} {style.size}px</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => applyStyle(name)}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                title="Apply to selected element"
              >
                Apply
              </button>
              <button
                onClick={() => toggleStyle(name)}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Edit
              </button>
            </div>
          </div>

          {openStyles.has(name) && (
            <div className="px-2 pb-2 space-y-1.5 border-t border-gray-600 pt-2">
              <div className="grid grid-cols-2 gap-1.5">
                <label className="text-xs text-gray-400">Font</label>
                <input
                  value={style.font}
                  onChange={(e) => updateStyle(name, 'font', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-blue-500"
                />
                <label className="text-xs text-gray-400">Size</label>
                <input
                  type="number"
                  value={style.size}
                  onChange={(e) => updateStyle(name, 'size', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-blue-500"
                />
                <label className="text-xs text-gray-400">Color</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={style.color}
                    onChange={(e) => updateStyle(name, 'color', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    value={style.color}
                    onChange={(e) => updateStyle(name, 'color', e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <label className="text-xs text-gray-400">Weight</label>
                <select
                  value={style.weight}
                  onChange={(e) => updateStyle(name, 'weight', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-300 outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="bold">Bold</option>
                </select>
                <label className="text-xs text-gray-400">RTL</label>
                <input
                  type="checkbox"
                  checked={!!style.rtl}
                  onChange={(e) => updateStyle(name, 'rtl', e.target.checked)}
                  className="mt-0.5"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
