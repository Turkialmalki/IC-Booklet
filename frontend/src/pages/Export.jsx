import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api, { API_BASE } from '../utils/api.js'
import ProgressBar from '../components/shared/ProgressBar.jsx'

export default function Export() {
  const { jobId }  = useParams()
  const navigate   = useNavigate()
  const location   = useLocation()

  const initialResult = location.state?.jobResult || null

  const [phase,    setPhase]    = useState(initialResult?.status === 'done' ? 'done' : 'connecting')
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, currentRowName: '', phaseName: '' })
  const [result,   setResult]   = useState(initialResult?.status === 'done' ? initialResult : null)
  const [error,    setError]    = useState(null)
  const esRef = useRef(null)

  useEffect(() => {
    if (phase === 'done') return

    const es = new EventSource(`${API_BASE}/api/export/progress/${jobId}`)
    esRef.current = es

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data)
        setPhase('rendering')
        setProgress({
          current:        data.current        || 0,
          total:          data.total          || 0,
          percent:        data.percent        || 0,
          currentRowName: data.currentRowName || data.phase || '',
          phaseName:      data.phase          || '',
        })
      } catch {}
    })

    es.addEventListener('done', (e) => {
      try { setResult(JSON.parse(e.data)) } catch {}
      setPhase('done')
      es.close()
    })

    es.addEventListener('failed', (e) => {
      try { setError(JSON.parse(e.data).error || 'Export failed') } catch { setError('Export failed') }
      setPhase('failed')
      es.close()
    })

    es.addEventListener('error', () => {
      es.close()
      pollStatus()
    })

    return () => { es.close() }
  }, [jobId])

  async function pollStatus() {
    try {
      const { data } = await api.get(`/api/export/status/${jobId}`)
      if      (data.status === 'done')   { setResult(data); setPhase('done') }
      else if (data.status === 'failed') { setError(data.error || 'Export failed'); setPhase('failed') }
      else    setTimeout(pollStatus, 2000)
    } catch {
      setError('Could not retrieve export status.')
      setPhase('failed')
    }
  }

  function downloadFile(url, filename) {
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-lg p-8">

        {/* Header icon + title */}
        <div className="text-center mb-8">
          {phase === 'done' ? (
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : phase === 'failed' ? (
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ) : (
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900">
            {phase === 'done'   ? 'Export complete!' :
             phase === 'failed' ? 'Export failed'    : 'Exporting…'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {phase === 'connecting' ? 'Waiting for worker…' :
             phase === 'rendering'  ? `Rendering — ${progress.currentRowName || ''}` :
             phase === 'done'       ? 'All pages rendered successfully' :
             phase === 'failed'     ? 'An error occurred' : ''}
          </p>
        </div>

        {/* Progress bar */}
        {(phase === 'connecting' || phase === 'rendering') && (
          <div className="mb-8">
            <ProgressBar
              percent={progress.percent}
              label={progress.total > 0 ? `${progress.current} / ${progress.total} pages` : 'Starting…'}
              sublabel={progress.currentRowName}
            />
            <p className="text-xs text-gray-400 mt-3 text-center">
              {phase === 'connecting'
                ? 'Waiting for the worker to pick up the job…'
                : 'Rendering with Puppeteer. Large batches may take a few minutes.'}
            </p>
          </div>
        )}

        {/* Error detail */}
        {phase === 'failed' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Download cards */}
        {phase === 'done' && result && (
          <div className="space-y-3 mb-8">
            {result.rowCount != null && (
              <p className="text-xs text-center text-gray-400 mb-4">
                {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} processed
              </p>
            )}
            {(result.outputs || []).map((output) => (
              <div key={output.format}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                    output.format === 'pdf' ? 'bg-red-500' : 'bg-orange-500'
                  }`}>
                    {output.format.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {output.filename || `export.${output.format}`}
                  </span>
                </div>
                <button
                  onClick={() => downloadFile(output.downloadUrl, output.filename || `export.${output.format}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate(-2)}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors"
          >
            Back to Preview
          </button>
        </div>
      </div>
    </div>
  )
}
