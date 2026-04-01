import { useNavigate } from 'react-router-dom'

export default function TemplateCard({ template, onDelete }) {
  const navigate = useNavigate()

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="relative bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">No preview</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">Edited {formatDate(template.updatedAt)}</p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => navigate(`/editor/${template.id}`)}
            className="flex-1 text-sm font-medium text-center px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => navigate(`/import/${template.id}`)}
            className="flex-1 text-sm font-medium text-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Use
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            title="Delete template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
