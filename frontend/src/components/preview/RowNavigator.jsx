import { useState } from 'react'

export default function RowNavigator({ rowIndex, totalRows, onNavigate }) {
  const [jumpValue, setJumpValue] = useState('')

  function jump() {
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalRows) {
      onNavigate(n - 1)
      setJumpValue('')
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => onNavigate(rowIndex - 1)}
        disabled={rowIndex === 0}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
        Row <span className="font-bold text-gray-900">{rowIndex + 1}</span> of {totalRows}
      </span>

      <button
        onClick={() => onNavigate(rowIndex + 1)}
        disabled={rowIndex >= totalRows - 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-xs text-gray-400">Jump to</span>
        <input
          type="number"
          min={1}
          max={totalRows}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && jump()}
          placeholder="row #"
          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={jump}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
        >
          Go
        </button>
      </div>
    </div>
  )
}
