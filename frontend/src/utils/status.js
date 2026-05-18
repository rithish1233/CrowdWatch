export const STATUS_CONFIG = {
  free: {
    label: 'Free',
    color: 'green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    ring: 'ring-green-400',
    hex: '#16a34a',
  },
  busy: {
    label: 'Busy',
    color: 'yellow',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400',
    hex: '#d97706',
  },
  full: {
    label: 'Full',
    color: 'red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    ring: 'ring-red-400',
    hex: '#dc2626',
  },
}

export const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG.free

export const formatTime = (date) => {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString()
}

export const pctToStatus = (pct) => {
  if (pct < 40) return 'free'
  if (pct < 75) return 'busy'
  return 'full'
}
