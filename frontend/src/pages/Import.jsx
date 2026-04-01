import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useImportStore } from '../store/index.js'
import { detectImageColumns, fetchAssetIndex } from '../utils/resolver.js'
import { detectTemplateVars } from '../utils/merger.js'

// Warn if a column is empty in >20% of rows
function getColumnWarnings(columns, rows) {
  const warnings = {}
  for (const col of columns) {
    const emptyCount = rows.filter((r) => !r[col] && r[col] !== 0).length
    if (emptyCount / rows.length > 0.2) {
      warnings[col] = `${emptyCount} of ${rows.length} rows empty`
    }
  }
  return warnings
}

const STEPS = ['Upload Data', 'Preview & Bind', 'Export Settings']

export default function Import() {
  const { templateId } = useParams()
  const navigate = useNavigate()

  const { rows, columns, columnBindings, assetJobId, exportMeta,
          setRows, setColumns, setColumnBindings, setAssetJobId, setAssetIndex, setExportMeta, reset } = useImportStore()

  const [template, setTemplate] = useState(null)
  const [step, setStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [imageColumns, setImageColumns] = useState(new Set())
  const [columnWarnings, setColumnWarnings] = useState({})
  const [zipUploading, setZipUploading] = useState(false)
  const [zipFileName, setZipFileName] = useState(null)
  const [zipFileCount, setZipFileCount] = useState(null)
  const fileInputRef = useRef()
  const zipInputRef = useRef()

  useEffect(() => {
    reset()
    axios.get(`/api/templates/${templateId}`)
      .then(({ data }) => {
        setTemplate(data)
        // Pre-populate asset index with every image already on the server so CSV
        // filenames (e.g. "pilgrimpal.jpeg") resolve without requiring a ZIP upload.
        fetchAssetIndex(null).then(globalIdx => {
          if (Object.keys(globalIdx).length > 0) setAssetIndex(globalIdx)
        })
      })
      .catch(() => navigate('/dashboard'))
  }, [templateId])

  // ── File parsing ──────────────────────────────────────────────
  function parseFile(file) {
    setParseError(null)
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data, meta }) => loadData(data, meta.fields || [], file.name),
        error: (err) => setParseError(err.message),
      })
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
          const cols = data.length > 0 ? Object.keys(data[0]) : []
          loadData(data, cols, file.name)
        } catch (err) {
          setParseError(`Failed to parse Excel file: ${err.message}`)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setParseError('Unsupported file type. Use .xlsx, .xls, or .csv')
    }
  }

  function loadData(data, cols, name) {
    setRows(data)
    setColumns(cols)
    setFileName(name)
    setImageColumns(detectImageColumns(cols, data))
    setColumnWarnings(getColumnWarnings(cols, data))

    // Auto-bind: match placeholder names to Excel/CSV columns.
    // First try exact case-insensitive match, then try normalizing
    // spaces/dashes to underscores (e.g. "Business Brief AR" → "business_brief_ar").
    const normSep = (s) => s.trim().toLowerCase().replace(/[\s\-]+/g, '_')
    const allVars = detectTemplateVars(template)
    const autoBindings = {}
    for (const varName of allVars) {
      const match =
        cols.find((c) => c.toLowerCase() === varName.toLowerCase()) ||
        cols.find((c) => normSep(c) === normSep(varName))
      if (match) autoBindings[varName] = match
    }
    setColumnBindings(autoBindings)
    setStep(1)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  // ── ZIP asset upload ──────────────────────────────────────────
  async function uploadZip(file) {
    try {
      setZipUploading(true)
      const form = new FormData()
      form.append('file', file)
      const { data } = await axios.post('/api/assets/upload', form)
      setAssetJobId(data.jobId)
      setZipFileName(file.name)
      setZipFileCount(data.fileCount ?? null)
      // Merge ZIP-specific index over whatever global index is already loaded.
      // ZIP entries take priority (same filename → prefer the freshly-uploaded copy).
      const zipIndex = await fetchAssetIndex(data.jobId)
      setAssetIndex({ ...assetIndex, ...zipIndex })
    } catch {
      setParseError('ZIP upload failed.')
    } finally {
      setZipUploading(false)
    }
  }

  // ── Column binding helpers ────────────────────────────────────
  // Combine explicit bindings + {{var}} patterns found in template text elements
  const detectedVars = template ? detectTemplateVars(template) : new Set()
  const explicitBindings = template?.bindings || {}

  // Build a unified list: { column, property, source }
  const placeholders = [
    // From explicit PlaceholderPanel bindings
    ...Object.values(explicitBindings).map(b => ({
      column: b.column,
      property: b.property,
      source: 'binding',
    })),
    // From {{var}} detected in text elements (not already in explicit bindings)
    ...[...detectedVars]
      .filter(v => !Object.values(explicitBindings).some(b => b.column === v))
      .map(v => ({ column: v, property: 'text', source: 'detected' })),
  ]

  function setBinding(placeholderCol, excelCol) {
    setColumnBindings({ ...columnBindings, [placeholderCol]: excelCol })
  }

  const boundCount = placeholders.filter((b) => columnBindings[b.column]).length
  const allBound = placeholders.length > 0 && boundCount === placeholders.length

  // ── Export meta ───────────────────────────────────────────────
  function updateMeta(field, value) {
    setExportMeta({ ...exportMeta, [field]: value })
  }

  function proceed() {
    navigate(`/preview/${templateId}`)
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(`/editor/${templateId}`)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{template?.name || 'Template'}</h1>
          <p className="text-xs text-gray-400">Import data &amp; bind columns</p>
        </div>
        <div className="flex-1" />
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-gray-800' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-300" />}
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── STEP 0: Upload ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload your data file</h2>
              <p className="text-sm text-gray-500">Supported formats: .xlsx, .xls, .csv</p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files[0]) parseFile(e.target.files[0]) }}
              />
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 font-medium">Drop your file here or <span className="text-blue-600">browse</span></p>
              <p className="text-sm text-gray-400 mt-1">.xlsx · .xls · .csv</p>
            </div>

            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{parseError}</div>
            )}

            {/* ZIP upload section */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-medium text-gray-800 mb-1">Local image assets (optional)</h3>
              <p className="text-sm text-gray-500 mb-3">
                If your data references image filenames (not URLs), upload a ZIP with all images. They'll be matched by filename.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => zipInputRef.current?.click()}
                  disabled={zipUploading}
                  className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  {zipUploading ? 'Uploading…' : 'Upload ZIP'}
                </button>
                {zipFileName && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ {zipFileName}
                    {zipFileCount != null && (
                      <span className="text-xs text-green-500 ml-1">({zipFileCount} images)</span>
                    )}
                  </span>
                )}
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => { if (e.target.files[0]) uploadZip(e.target.files[0]) }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Preview + Bind ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Preview &amp; bind columns</h2>
                <p className="text-sm text-gray-500">
                  {rows.length} rows · {columns.length} columns · from <span className="font-medium">{fileName}</span>
                </p>
              </div>
              <button onClick={() => setStep(0)} className="text-sm text-gray-400 hover:text-gray-600 underline">
                Change file
              </button>
            </div>

            {/* Data preview table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Data preview (first 5 rows)</span>
                <span className="text-xs text-gray-400">{rows.length} total rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {col}
                            {imageColumns.has(col) && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded font-medium">img</span>
                            )}
                            {columnWarnings[col] && (
                              <span title={columnWarnings[col]} className="text-yellow-500">⚠</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column binding UI */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Column bindings</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Map each template placeholder to an Excel/CSV column
                </p>
              </div>

              {placeholders.length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <p className="text-gray-500 text-sm">No placeholders found in this template.</p>
                  <p className="text-gray-400 text-xs">
                    In the editor, type <code className="bg-gray-100 px-1 rounded">{"{{column_name}}"}</code> in any text box,
                    or use the <strong>Data</strong> tab to add placeholders.
                  </p>
                  <button onClick={() => navigate(`/editor/${templateId}`)} className="text-blue-500 underline text-sm">
                    Open Editor
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {placeholders.map((ph) => {
                    const col = ph.column
                    const isBound = !!columnBindings[col]
                    const isImage = ph.property === 'src'
                    const warning = isBound ? columnWarnings[columnBindings[col]] : null
                    const boundCol = columnBindings[col]

                    return (
                      <div key={col} className="px-4 py-3 flex items-center gap-4">
                        {/* Placeholder tag */}
                        <div className="w-52 shrink-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium font-mono ${
                              isImage ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {`{{${col}}}`}
                            </span>
                            <span className="text-xs text-gray-400">{isImage ? 'image' : 'text'}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>

                        {/* Column selector */}
                        <div className="flex-1 min-w-0">
                          <select
                            value={boundCol || ''}
                            onChange={(e) => setBinding(col, e.target.value)}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${
                              isBound
                                ? 'border-green-300 bg-green-50 text-gray-800 focus:border-green-500'
                                : 'border-gray-300 bg-white text-gray-800 focus:border-blue-500'
                            }`}
                          >
                            <option value="">— select a column —</option>
                            {columns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          {warning && <p className="text-xs text-yellow-600 mt-0.5">⚠ {warning}</p>}
                          {isBound && (
                            <p className="text-xs text-green-600 mt-0.5 truncate">
                              Will use column: <strong>{boundCol}</strong>
                            </p>
                          )}
                        </div>

                        {/* Status dot */}
                        <div className="w-5 shrink-0 text-center">
                          {isBound
                            ? <span className="text-green-500 text-base">✓</span>
                            : <span className="text-gray-300 text-base">○</span>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {boundCount} of {placeholders.length} placeholders bound
                </span>
                {!allBound && placeholders.length > 0 && (
                  <span className="text-xs text-yellow-600">Some placeholders are unbound — their data values will not appear in the preview</span>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Next: Export Settings →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Export settings ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Export settings</h2>
              <p className="text-sm text-gray-500">Optional metadata added to the cover and back pages</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              {[
                { field: 'report_title', label: 'Report title', placeholder: 'MENA Startup Portfolio Q1 2025' },
                { field: 'prepared_by',  label: 'Prepared by',  placeholder: 'Ventures Team' },
                { field: 'date',         label: 'Date',         placeholder: 'March 2025' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    value={exportMeta[field] || ''}
                    onChange={(e) => updateMeta(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
              <p><strong>{rows.length}</strong> rows will be processed</p>
              <p><strong>{boundCount}</strong> of {placeholders.length} placeholders bound</p>
              {assetJobId && <p>✓ Asset ZIP uploaded (job: {assetJobId})</p>}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 underline">
                ← Back
              </button>
              <button
                onClick={proceed}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Preview →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
