export default function ValidationSummary({ validationResults, currentRowIndex, onJumpTo }) {
  if (!validationResults?.length) return null

  const ready    = validationResults.filter(r => r.issues.length === 0)
  const warnings = validationResults.filter(r => r.issues.length > 0 && r.issues.every(i => i.severity !== 'error'))
  const errors   = validationResults.filter(r => r.issues.some(i => i.severity === 'error'))
  const problemRows = [...errors, ...warnings]

  return (
    <div className="space-y-3">
      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg py-2">
          <div className="text-lg font-bold text-green-700">{ready.length}</div>
          <div className="text-xs text-green-600">Ready</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg py-2">
          <div className="text-lg font-bold text-yellow-700">{warnings.length}</div>
          <div className="text-xs text-yellow-600">Warnings</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg py-2">
          <div className="text-lg font-bold text-red-700">{errors.length}</div>
          <div className="text-xs text-red-600">Errors</div>
        </div>
      </div>

      {/* Problem rows */}
      {problemRows.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Issues</p>
          {problemRows.map((result) => {
            const hasError = result.issues.some(i => i.severity === 'error')
            const isActive = result.rowIndex === currentRowIndex
            return (
              <button
                key={result.rowIndex}
                onClick={() => onJumpTo(result.rowIndex)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-gray-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{hasError ? '❌' : '⚠️'}</span>
                  <span className="font-medium text-gray-700 truncate">{result.label}</span>
                </div>
                <div className="ml-5 text-gray-400 truncate">
                  {result.issues.slice(0, 2).map(i => i.column).join(', ')}
                  {result.issues.length > 2 && ` +${result.issues.length - 2} more`}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
