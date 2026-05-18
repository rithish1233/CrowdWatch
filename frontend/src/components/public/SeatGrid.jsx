export default function SeatGrid({ seats, rows, cols }) {
  if (!seats || seats.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        No seat data available
      </div>
    )
  }

  // Build 2D grid
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null))
  seats.forEach((seat) => {
    if (seat.row < rows && seat.col < cols) {
      grid[seat.row][seat.col] = seat
    }
  })

  const occupied = seats.filter((s) => s.isOccupied).length
  const total = seats.length
  const available = total - occupied

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span>Available ({available})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Occupied ({occupied})</span>
        </div>
        <div className="ml-auto text-gray-400">
          {total} total seats
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex gap-1 mb-1 pl-6">
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="w-7 text-center text-xs text-gray-400 font-medium">
                {c + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-1 mb-1">
              {/* Row label */}
              <div className="w-5 text-xs text-gray-400 font-medium text-right mr-1">
                {String.fromCharCode(65 + rIdx)}
              </div>
              {row.map((seat, cIdx) => (
                <div
                  key={cIdx}
                  title={seat ? `${seat.label} — ${seat.isOccupied ? 'Occupied' : 'Available'}` : ''}
                  className={`w-7 h-7 rounded transition-all duration-300 border text-xs flex items-center justify-center font-medium
                    ${seat
                      ? seat.isOccupied
                        ? 'bg-red-400 border-red-500 text-white'
                        : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                      : 'bg-gray-50 border-gray-100 opacity-30'
                    }`}
                >
                  {seat && !seat.isOccupied && (
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l-2-2-2 2 2 2 2-2zm4 0l-2-2-2 2 2 2 2-2z" />
                    </svg>
                  )}
                  {seat && seat.isOccupied && (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
