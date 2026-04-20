// ── Small helpers ────────────────────────────────────────────────────────────

// Look up a column value in rowData, with a fallback that normalises
// underscores ↔ spaces so "business_brief_ar" matches "business brief ar".
function lookupCol(rowData, col) {
  if (!rowData || col == null) return undefined
  let val = rowData[col]
  if (val !== undefined) return val
  // Fallback: try spaces instead of underscores (e.g. Excel column "business brief ar")
  if (col.includes('_')) {
    val = rowData[col.replace(/_/g, ' ')]
    if (val !== undefined) return val
  }
  // Fallback: try underscores instead of spaces
  if (col.includes(' ')) {
    val = rowData[col.replace(/ /g, '_')]
    if (val !== undefined) return val
  }
  return undefined
}

// Replace {{var}} tokens in a string using rowData + columnBindings
function interpolate(text, rowData, columnBindings) {
  if (!text || !text.includes('{{')) return text
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const col = columnBindings?.[key] || key
    const val = lookupCol(rowData, col)
    return (val !== undefined && val !== null) ? String(val) : match
  })
}

// Returns true when ≥40% of characters are in the Arabic Unicode block
function isArabicText(text) {
  if (!text || text.length === 0) return false
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  return arabicChars / text.length >= 0.4
}

// Estimate number of rendered lines given container width and font size
function estimateLineCount(text, containerWidth, fontSize) {
  if (!text || !containerWidth || !fontSize) return 1
  const charsPerLine = Math.max(1, containerWidth / (fontSize * 0.55))
  return text.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil((line.length || 1) / charsPerLine))
  }, 0)
}

// Split long text into a "• item\n• item" bulleted list
function convertToBulletList(text) {
  const parts = text.split(/(?<=[.؛!?])\s+|\n+/).map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) return `• ${text.trim()}`
  return parts.map(p => `• ${p}`).join('\n')
}

// Binding-level properties that must be copied onto the element before render
const BIND_PROPS = [
  'imageFit', 'imageFrame', 'isBackground', 'maxAreaPercent', 'isLogo',
  'resizeToFit', 'shrinkOnOverflow', 'minFontSize', 'rtl',
]

// ── Core merge ───────────────────────────────────────────────────────────────

// Merge data into a single page's polotnoJson.
// layoutRules (optional) comes from template.layoutRules.
export function mergePageData(pageJson, rowData, bindings, columnBindings, layoutRules) {
  const merged = JSON.parse(JSON.stringify(pageJson))
  if (!merged.children) return merged

  for (const el of merged.children) {
    const binding = bindings?.[el.id]

    if (binding) {
      // 1. Copy rendering/style properties from binding onto element
      for (const prop of BIND_PROPS) {
        if (binding[prop] !== undefined) el[prop] = binding[prop]
      }

      // 2. Resolve and apply bound value
      const actualCol = binding.column ? (columnBindings?.[binding.column] || binding.column) : null
      const value = lookupCol(rowData, actualCol)
      if (binding.property === 'url') {
        // Display text: prefer staticLabel (new), fall back to label column (backward compat)
        if (binding.staticLabel) {
          el.text = binding.staticLabel
        } else if (binding.column && binding.column !== binding.urlColumn) {
          if (value !== undefined && value !== null && value !== '') {
            el.text = String(value)
          }
        }
        // href from the URL column (binding.urlColumn)
        const urlColName = columnBindings?.[binding.urlColumn] || binding.urlColumn
        if (urlColName) {
          const urlValue = lookupCol(rowData, urlColName)
          if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
            el.href = String(urlValue)
          }
        }
      } else if (value !== undefined && value !== null && value !== '') {
        if (binding.property === 'text') {
          let text = String(value)

          // RTL auto-detection (Arabic script ≥40%)
          if (el.rtl === undefined && isArabicText(text)) el.rtl = true

          // Overflow → bulleted list when text would exceed threshold lines
          const threshold = layoutRules?.overflowLineThreshold ?? 5
          if (estimateLineCount(text, el.width || 400, el.fontSize || 16) > threshold) {
            text = convertToBulletList(text)
            el.lineHeight = layoutRules?.bulletLineSpacing || 1.2
            el._bulletConverted = true
          }

          el.text = text
        } else if (binding.property === 'src') {
          el.src = String(value)
        }
      }

      // 3. Logo pinning — override x/y from layoutRules.logoPosition
      if (binding.isLogo && layoutRules?.logoPosition) {
        const lp = layoutRules.logoPosition
        const pageH = merged.height || 1080
        const pageW = merged.width  || 1920
        if (lp.corner === 'bottom-left') {
          el.x = lp.x ?? 24
          el.y = pageH + (lp.y ?? -80)
        } else if (lp.corner === 'bottom-right') {
          el.x = pageW - (el.width || 200) - (lp.x ?? 24)
          el.y = pageH + (lp.y ?? -80)
        }
      }

      // 4. Title centering
      if (binding.styleRef === 'title' && layoutRules?.titleAlign === 'center') {
        el.align = 'center'
      }
    }

    // Template-string interpolation — handles {{var}} typed directly in text boxes
    if (el.type === 'text' && el.text?.includes('{{')) {
      el.text = interpolate(el.text, rowData, columnBindings)
    }
  }

  return merged
}

// Scan all template pages and collect every {{var}} name found in text elements
export function detectTemplateVars(template) {
  const vars = new Set()
  for (const page of template?.pages || []) {
    for (const el of page.polotnoJson?.children || []) {
      if (el.type === 'text' && el.text) {
        const matches = el.text.match(/\{\{(\w+)\}\}/g) || []
        for (const m of matches) vars.add(m.slice(2, -2))
      }
    }
  }
  for (const b of Object.values(template?.bindings || {})) {
    if (b.property === 'url') {
      if (b.urlColumn) vars.add(b.urlColumn)
    } else if (b.column) {
      vars.add(b.column)
    }
  }
  return vars
}

export function mergeRowIntoTemplate(templateJson, rowData, columnBindings) {
  const merged = JSON.parse(JSON.stringify(templateJson))
  const layoutRules = merged.layoutRules

  for (const page of merged.pages || []) {
    const polotno = page.polotnoJson
    if (!polotno?.children) continue

    for (const el of polotno.children) {
      const binding = merged.bindings?.[el.id]

      if (binding) {
        // Copy rendering properties from binding onto element
        for (const prop of BIND_PROPS) {
          if (binding[prop] !== undefined) el[prop] = binding[prop]
        }

        const columnName = binding.column ? (columnBindings?.[binding.column] || binding.column) : null
        const value = lookupCol(rowData, columnName)

        if (binding.property === 'url') {
          // Display text: prefer staticLabel (new), fall back to label column (backward compat)
          if (binding.staticLabel) {
            el.text = binding.staticLabel
          } else if (binding.column && binding.column !== binding.urlColumn) {
            if (value !== undefined && value !== null && value !== '') {
              el.text = String(value)
            }
          }
          // href from URL column
          const urlColName = columnBindings?.[binding.urlColumn] || binding.urlColumn
          if (urlColName) {
            const urlValue = lookupCol(rowData, urlColName)
            if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
              el.href = String(urlValue)
            }
          }
        } else if (binding.property === 'text' && value !== undefined) {
          let text = String(value)

          // RTL auto-detection
          if (el.rtl === undefined && isArabicText(text)) el.rtl = true

          // Overflow → bullet conversion
          const threshold = layoutRules?.overflowLineThreshold ?? 5
          if (estimateLineCount(text, el.width || 400, el.fontSize || 16) > threshold) {
            text = convertToBulletList(text)
            el.lineHeight = layoutRules?.bulletLineSpacing || 1.2
          }

          el.text = text
        } else if (binding.property === 'src' && value !== undefined) {
          el.src = value
        }

        // Logo pinning
        if (binding.isLogo && layoutRules?.logoPosition) {
          const lp = layoutRules.logoPosition
          const pageH = polotno.height || 1080
          const pageW = polotno.width  || 1920
          if (lp.corner === 'bottom-left') {
            el.x = lp.x ?? 24
            el.y = pageH + (lp.y ?? -80)
          } else if (lp.corner === 'bottom-right') {
            el.x = pageW - (el.width || 200) - (lp.x ?? 24)
            el.y = pageH + (lp.y ?? -80)
          }
        }

        // Title centering
        if (binding.styleRef === 'title' && layoutRules?.titleAlign === 'center') {
          el.align = 'center'
        }
      }

      if (el.type === 'text' && el.text?.includes('{{')) {
        el.text = interpolate(el.text, rowData, columnBindings)
      }
    }
  }

  return merged
}

// ── Slide numbering ──────────────────────────────────────────────────────────

// Inject a page-number footer element into each page in the array.
// Pages is an array of polotnoJson objects (already merged).
export function injectSlideNumbers(pages, slideNumbering) {
  if (!slideNumbering?.enabled) return pages
  const total = pages.length
  const style  = slideNumbering.style || {}
  const font   = style.font   || 'Inter'
  const size   = style.size   || 11
  const color  = style.color  || '#888888'
  const format = slideNumbering.format || 'page_x_of_y'

  return pages.map((page, idx) => {
    const label = format === 'page_x_of_y'
      ? `Page ${idx + 1} of ${total}`
      : String(idx + 1)
    const w = page.width  || 1920
    const h = page.height || 1080
    const numEl = {
      id: `__pagenum_${idx}`,
      type: 'text',
      x: w - 120,
      y: h - 36,
      width: 104,
      height: 24,
      text: label,
      fontSize: size,
      fill: color,
      fontFamily: font,
      align: 'right',
      opacity: 1,
    }
    return { ...page, children: [...(page.children || []), numEl] }
  })
}
