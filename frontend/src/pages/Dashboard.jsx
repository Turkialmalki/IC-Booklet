import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api.js'
import TemplateCard from '../components/shared/TemplateCard.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [newName, setNewName] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      setLoading(true)
      const { data } = await api.get('/api/templates')
      setTemplates(data.templates || [])
    } catch {
      setError('Failed to load templates. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  async function createTemplate() {
    if (!newName.trim()) return
    try {
      setCreating(true)
      // Always seed from the Monshaat master template (tpl_monshaat).
      // Falls back to most-recently-updated if not found, or blank if neither exists.
      let seedPages = []
      try {
        const { data: list } = await api.get('/api/templates')
        const all = list.templates || []
        // Prefer the dedicated Monshaat template
        const monshaat = all.find(t => t.id === 'tpl_monshaat')
        const seedId = monshaat
          ? monshaat.id
          : all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.id
        if (seedId) {
          const { data: seed } = await api.get(`/api/templates/${seedId}`)
          seedPages = seed.pages || []
        }
      } catch { /* no seed — start blank */ }

      const { data } = await api.post('/api/templates', {
        name: newName.trim(),
        pages: seedPages,
      })
      setShowNameModal(false)
      setNewName('')
      navigate(`/editor/${data.id}`)
    } catch {
      setError('Failed to create template.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Delete this template? This cannot be undone.')) return
    try {
      setDeletingId(id)
      await api.delete(`/api/templates/${id}`)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete template.')
    } finally {
      setDeletingId(null)
    }
  }

  const sorted = [...templates].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">innovationCenter Startups booklet</h1>
        </div>
        <button
          onClick={() => setShowNameModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Templates section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Templates
              {!loading && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </span>
              )}
            </h2>
            {!loading && templates.length > 0 && (
              <button
                onClick={fetchTemplates}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="bg-gray-100 aspect-video" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="flex gap-2 mt-4">
                      <div className="h-8 bg-gray-100 rounded flex-1" />
                      <div className="h-8 bg-gray-100 rounded flex-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-gray-500 font-medium">No templates yet</h3>
              <p className="text-gray-400 text-sm mt-1 mb-6">Create your first template to get started</p>
              <button
                onClick={() => setShowNameModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                + New Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sorted.map((template) => (
                <div key={template.id} className={deletingId === template.id ? 'opacity-50 pointer-events-none' : ''}>
                  <TemplateCard template={template} onDelete={deleteTemplate} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* New Template Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Template</h3>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTemplate()}
              placeholder="Template name…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowNameModal(false); setNewName('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTemplate}
                disabled={creating || !newName.trim()}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
