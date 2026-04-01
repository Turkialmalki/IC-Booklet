import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api.js'
import { useImportStore } from '../store/index.js'
import { validateRows } from '../utils/validator.js'
import PreviewCanvas from '../components/preview/PreviewCanvas.jsx'
import RowNavigator from '../components/preview/RowNavigator.jsx'
import ValidationSummary from '../components/preview/ValidationSummary.jsx'

const PAGE_ROLES = ['cover', 'slide', 'back']

export default function Preview() {
  const { templateId } = useParams()
  const navigate = useNavigate()

  const { rows, columnBindings, exportMeta, assetJobId } = useImportStore()

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rowIndex, setRowIndex] = useState(0)
  const [activeRole, setActiveRole] = useState('slide')
  const [slidePageIndex, setSlidePageIndex] = useState(0)
  const [validationResults, setValidationResults] = useState([])

  // Export state
  const [exportFormat, setExportFormat] = useState('pdf')
  const [outputFilename, setOutputFilename] = useState('export')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  // Accurate render state
  const [accurateRenderUrl, setAccurateRenderUrl] = useState(null)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    if (!templateId) { navigate('/dashboard'); return }
    api.get(`/api/templates/${templateId}`)
      .then(({ data }) => {
        setTemplate(data)
        setOutputFilename(data.name?.toLowerCase().replace(/\s+/g, '-') || 'export')
        setLoading(false)
      })
      .catch(() => navigate('/dashboard'))
  }, [templateId])

  // Run validation whenever template or rows change
  useEffect(() => {
    if (!template || !rows.length) return
    // Build effective bindings using columnBindings mapping
    const effectiveBindings = {}
    for (const [elId, binding] of Object.entries(template.bindings || {})) {
      const actualCol = columnBindings[binding.column] || binding.column
      effectiveBindings[elId] = { ...binding, column: actualCol }
    }
    const results = validateRows(rows, effectiveBindings, template)
    setValidationResults(results)
  }, [template, rows, columnBindings])

  function navigate_ (n) {
    const clamped = Math.max(0, Math.min(n, rows.length - 1))
    setRowIndex(clamped)
    setAccurateRenderUrl(null)
  }

  // All pages for the active role (there can be multiple slide pages)
  const activeRolePages = template?.pages?.filter(p => p.role === activeRole) || []
  const safeSlideIdx = Math.min(slidePageIndex, Math.max(0, activeRolePages.length - 1))
  const activePage = activeRolePages[safeSlideIdx]
  const activePageJson = activePage?.polotnoJson || null

  // All page roles receive both row data and exportMeta merged together
  // (row data takes priority). This supports "booklet-per-row" templates where
  // cover/back pages also contain data-bound fields from the spreadsheet.
  const currentRowData = { ...exportMeta, ...(rows[rowIndex] || {}) }

  async function accurateRender() {
    if (!activePageJson || !template) return
    try {
      setRendering(true)
      setAccurateRenderUrl(null)
      const { data } = await api.post('/api/preview/render', {
        pageJson: activePageJson,
        rowData: currentRowData,
        bindings: template.bindings,
        columnBindings,
        textStyles: template.textStyles,
      })
      setAccurateRenderUrl(data.imageUrl)
    } catch {
      setExportError('Accurate render not available yet (Phase 11).')
    } finally {
      setRendering(false)
    }
  }

  async function startExport() {
    if (!template || !rows.length) return
    try {
      setExporting(true)
      setExportError(null)
      const payload = {
        templateId,
        format: exportFormat,
        exportMeta,
        rows,
        columnBindings,
        assetJobId: assetJobId || null,
        outputFilename,
      }
      const { data } = await api.post('/api/export/start', payload)
      navigate(`/export/${data.jobId}`, { state: { jobResult: data } })
    } catch {
      setExportError('Failed to start export. Is the backend running?')
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium mb-3">No data loaded.</p>
          <button
            onClick={() => navigate(`/import/${templateId}`)}
            className="text-blue-600 underline text-sm"
          >
            Go back to import
          </button>
        </div>
      </div>
    )
  }

  if (!template?.pages?.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Template has no pages</h2>
          <p className="text-sm text-gray-500 mb-5">
            Open the editor and design at least one <strong>slide</strong> page, then save. Come back here to preview.
          </p>
          <button
            onClick={() => navigate(`/editor/${templateId}`)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Open Editor →
          </button>
        </div>
      </div>
    )
  }

  const currentValidation = validationResults[rowIndex]
  const errorCount  = validationResults.filter(r => r.issues.some(i => i.severity === 'error')).length
  const warningCount = validationResults.filter(r => r.issues.length > 0 && r.issues.every(i => i.severity !== 'error')).length

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(`/import/${templateId}`)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div>
          <h1 className="text-base font-semibold text-gray-900">{template?.name}</h1>
          <p className="text-xs text-gray-400">{rows.length} rows · preview mode</p>
        </div>

        <div className="flex-1" />

        {/* Page role tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {PAGE_ROLES.filter(role => template?.pages?.some(p => p.role === role)).map(role => (
              <button
                key={role}
                onClick={() => { setActiveRole(role); setSlidePageIndex(0); setAccurateRenderUrl(null) }}
                className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${
                  activeRole === role
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role}
                {template?.pages?.filter(p => p.role === role).length > 1 && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({template.pages.filter(p => p.role === role).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Sub-page navigator for roles with multiple pages */}
          {activeRolePages.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSlidePageIndex(i => Math.max(0, i - 1)); setAccurateRenderUrl(null) }}
                disabled={safeSlideIdx === 0}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-xs"
              >‹</button>
              <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                {safeSlideIdx + 1} / {activeRolePages.length}
              </span>
              <button
                onClick={() => { setSlidePageIndex(i => Math.min(activeRolePages.length - 1, i + 1)); setAccurateRenderUrl(null) }}
                disabled={safeSlideIdx === activeRolePages.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-xs"
              >›</button>
            </div>
          )}
        </div>

        {/* Accurate render */}
        <button
          onClick={accurateRender}
          disabled={rendering}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
        >
          {rendering ? (
            <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
          Accurate Render
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar: Validation */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Validation</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ValidationSummary
              validationResults={validationResults}
              currentRowIndex={rowIndex}
              onJumpTo={navigate_}
            />
          </div>
        </aside>

        {/* Center: Canvas + row nav + export */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas area */}
          <div className="flex-1 overflow-hidden p-4 relative">
            {/* Current row issue badge */}
            {currentValidation?.issues.length > 0 && (
              <div className={`absolute top-6 right-6 z-20 text-xs px-2 py-1 rounded-full font-medium ${
                currentValidation.issues.some(i => i.severity === 'error')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {currentValidation.issues.length} issue{currentValidation.issues.length > 1 ? 's' : ''} on this row
              </div>
            )}

            {/* Accurate render overlay */}
            {accurateRenderUrl ? (
              <div className="w-full h-full relative rounded-xl overflow-hidden shadow-lg">
                <img src={accurateRenderUrl} alt="Accurate render" className="w-full h-full object-contain" />
                <button
                  onClick={() => setAccurateRenderUrl(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded px-2 py-1 text-xs hover:bg-black/70"
                >
                  ✕ Close
                </button>
              </div>
            ) : (
              <PreviewCanvas
                pageJson={activePageJson}
                rowData={currentRowData}
                bindings={template?.bindings}
                columnBindings={columnBindings}
              />
            )}
          </div>

          {/* Bottom bar: Row navigator + export */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 shrink-0 space-y-3">
            {/* Row navigator (only for slide role) */}
            {activeRole === 'slide' && (
              <RowNavigator
                rowIndex={rowIndex}
                totalRows={rows.length}
                onNavigate={navigate_}
              />
            )}

            {/* Export controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="pptx">PPTX</option>
                <option value="both">PDF + PPTX</option>
              </select>

              <input
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="output-filename"
                className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />

              <button
                onClick={startExport}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    Export
                    {errorCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                        {errorCount} errors
                      </span>
                    )}
                    →
                  </>
                )}
              </button>

              {exportError && (
                <span className="text-xs text-red-500">{exportError}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
