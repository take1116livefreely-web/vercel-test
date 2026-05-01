type Status = 'open' | 'in_progress' | 'closed'

const CONFIG: Record<Status, { label: string; className: string }> = {
  open:        { label: '未対応',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_progress: { label: '対応中',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
  closed:      { label: '解決済み', className: 'bg-green-100 text-green-700 border-green-200' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = CONFIG[status] ?? CONFIG.open
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  )
}
