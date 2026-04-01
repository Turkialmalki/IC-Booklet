import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'

const ROLES = ['cover', 'slide', 'back']

const PagesPanel = observer(({ store, template, onTemplateChange }) => {
  const [, forceUpdate] = useState(0)

  const slideNumbering = template?.slideNumbering || {}

  function setSlideNumbering(patch) {
    const updated = { ...slideNumbering, ...patch }
    onTemplateChange?.({ ...template, slideNumbering: updated })
  }

  useEffect(() => {
    // Re-render when pages change
    const dispose = store.pages.observe?.(() => forceUpdate(n => n + 1))
    return () => dispose?.()
  }, [store])

  function setPageRole(page, role) {
    page.set({ custom: { ...page.custom, role } })
    forceUpdate(n => n + 1)
  }

  function addPage(role = 'slide') {
    // Snapshot the current store state before modifying anything
    const storeJson = store.toJSON()

    // Find the last existing slide page to clone its design
    let srcPageJson = null
    if (role === 'slide') {
      for (let i = store.pages.length - 1; i >= 0; i--) {
        if ((store.pages[i]?.custom?.role || 'slide') === 'slide') {
          srcPageJson = storeJson.pages[i]
          break
        }
      }
    }

    const newPageIdx = storeJson.pages.length
    const newPageId  = `page_${Math.random().toString(36).slice(2, 9)}`

    // Build the new page JSON — clone source or empty fallback
    const newPageJson = srcPageJson
      ? {
          ...srcPageJson,
          id: newPageId,
          custom: { role },
          // Every element needs a fresh unique ID so MST doesn't collide
          children: (srcPageJson.children || []).map((child, ci) => ({
            ...child,
            id: `p${newPageIdx}_c${ci}_${Math.random().toString(36).slice(2, 7)}`,
          })),
        }
      : { id: newPageId, background: '#ffffff', custom: { role }, children: [] }

    // Atomically append the new page via loadJSON — same pattern Editor uses.
    // page.addElement() is unreliable for bulk inserts; loadJSON is the only
    // safe way to restore elements from JSON in Polotno's MST store.
    // Use store.width/height (always numeric) not storeJson.width/height ("auto" in Polotno 2.x).
    store.loadJSON({
      ...storeJson,
      width:  store.width  || 1920,
      height: store.height || 1080,
      pages: [...storeJson.pages, newPageJson],
    })

    // Select the newly added page
    const newPage = store.pages[store.pages.length - 1]
    if (newPage) store.selectPage(newPage.id)
  }

  function deletePage(page) {
    if (store.pages.length <= 1) return
    store.deletePages([page])
  }

  return (
    <div className="space-y-2">

      {/* ── Slide Numbering toggle ── */}
      {template && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-2 space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!slideNumbering.enabled}
              onChange={(e) => setSlideNumbering({ enabled: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-xs text-gray-300 font-medium">Page numbering</span>
          </label>
          {slideNumbering.enabled && (
            <select
              value={slideNumbering.format || 'page_x_of_y'}
              onChange={(e) => setSlideNumbering({ format: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 outline-none"
            >
              <option value="page_x_of_y">Page X of Y</option>
              <option value="simple">X (number only)</option>
            </select>
          )}
        </div>
      )}

      {store.pages.map((page, i) => {
        const role = page.custom?.role || 'slide'
        const isActive = store.activePage?.id === page.id
        return (
          <div
            key={page.id}
            onClick={() => store.selectPage(page.id)}
            className={`rounded-lg p-2 cursor-pointer border transition-colors ${
              isActive
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-transparent hover:border-gray-600 hover:bg-gray-700/50'
            }`}
          >

            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-gray-300 truncate">Page {i + 1}</span>
              <div className="flex items-center gap-1">
                <select
                  value={role}
                  onChange={(e) => { e.stopPropagation(); setPageRole(page, e.target.value) }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs bg-gray-700 text-gray-300 border border-gray-600 rounded px-1 py-0.5 outline-none"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {store.pages.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePage(page) }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete page"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded font-medium ${
              role === 'cover' ? 'bg-purple-900/50 text-purple-300' :
              role === 'back'  ? 'bg-orange-900/50 text-orange-300' :
                                 'bg-green-900/50 text-green-300'
            }`}>
              {role}
            </div>
          </div>
        )
      })}
      <button
        onClick={() => addPage('slide')}
        className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-white border border-dashed border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
      >
        + Add Page
      </button>
    </div>
  )
})

export default PagesPanel
