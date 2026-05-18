export default function SummaryBar({ summary }) {
  const items = [
    { label: 'Total Places', value: summary.total, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'Free', value: summary.free, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Busy', value: summary.busy, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Full', value: summary.full, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className={`card px-4 py-3 border ${item.border} ${item.bg} flex flex-col items-center text-center`}
        >
          <span className={`text-3xl font-display font-bold ${item.color}`}>
            {item.value}
          </span>
          <span className="text-xs text-gray-500 mt-0.5">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
