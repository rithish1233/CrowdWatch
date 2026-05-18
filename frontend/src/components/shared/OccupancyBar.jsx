export default function OccupancyBar({ percentage, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, percentage || 0))
  const color =
    pct < 40 ? 'bg-green-500' : pct < 75 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Occupancy</span>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
