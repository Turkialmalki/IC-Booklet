export default function ProgressBar({ percent = 0, label = '', sublabel = '' }) {
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1.5">
        {label    && <span className="text-sm font-medium text-gray-700 truncate">{label}</span>}
        <span className="text-sm font-bold text-blue-600 ml-auto">{clamped}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {sublabel && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">{sublabel}</p>
      )}
    </div>
  )
}
