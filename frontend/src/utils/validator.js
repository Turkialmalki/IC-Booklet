function isValidImageSource(value) {
  if (!value) return false
  if (value.startsWith('http')) return true
  if (value.startsWith('data:image')) return true
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
  return imageExtensions.some(ext => value.toLowerCase().endsWith(ext))
}

function isPng(value) {
  if (!value) return false
  if (value.startsWith('data:image/png')) return true
  return value.toLowerCase().endsWith('.png')
}

// Check whether two axis-aligned rectangles intersect by more than `margin` px
function rectsOverlap(a, b, margin = 10) {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  )
}

export function validateRows(rows, bindings, template) {
  return rows.map((row, i) => {
    const issues = []
    for (const [, binding] of Object.entries(bindings || {})) {
      const value = row[binding.column]
      if (!value) {
        issues.push({
          type: 'missing',
          column: binding.column,
          severity: binding.required ? 'error' : 'warning',
        })
      }
      if (binding.property === 'src' && value && !isValidImageSource(value)) {
        issues.push({
          type: 'invalid_image',
          column: binding.column,
          severity: 'warning',
        })
      }
      // Logo elements should use PNG for transparent background
      if (binding.isLogo && value && !isPng(value)) {
        issues.push({
          type: 'logo_not_png',
          column: binding.column,
          severity: 'warning',
          message: `Logo column "${binding.column}" should use a PNG for transparent background (got non-PNG source)`,
        })
      }
    }
    return {
      rowIndex: i,
      label: row[template?.labelColumn] || `Row ${i + 1}`,
      issues,
    }
  })
}

// Detect logo-vs-body overlap issues on template pages (called once, not per row).
// Returns an array of { pageIndex, message } warning objects.
export function checkSlideLayoutIssues(template) {
  const warnings = []
  const bindings = template?.bindings || {}

  // Collect logo element IDs
  const logoIds = new Set(
    Object.entries(bindings)
      .filter(([, b]) => b.isLogo)
      .map(([id]) => id)
  )

  for (const [pi, page] of (template?.pages || []).entries()) {
    const children = page.polotnoJson?.children || []
    const logoEls  = children.filter(el => logoIds.has(el.id))
    const bodyEls  = children.filter(el => !logoIds.has(el.id) && el.type !== 'image' || !logoIds.has(el.id))

    for (const logo of logoEls) {
      const la = { x: logo.x || 0, y: logo.y || 0, w: logo.width || 0, h: logo.height || 0 }
      for (const body of bodyEls) {
        const ba = { x: body.x || 0, y: body.y || 0, w: body.width || 0, h: body.height || 0 }
        if (rectsOverlap(la, ba)) {
          warnings.push({
            pageIndex: pi,
            message: `Logo overlaps body content on page ${pi + 1} — adjust logo position or body layout`,
          })
          break // one warning per page is enough
        }
      }
    }
  }

  return warnings
}
