import { getStatusConfig } from '../../utils/status'

export default function StatusBadge({ status, size = 'md' }) {
  const cfg = getStatusConfig(status)
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.badge} ${sizes[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  )
}
