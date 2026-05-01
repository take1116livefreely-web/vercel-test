import Link from 'next/link'

type Props = {
  page: number
  totalPages: number
  query: string
  status?: string
}

function href(page: number, query: string, status?: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status) params.set('status', status)
  params.set('page', String(page))
  return `/?${params.toString()}`
}

export default function SimpleNav({ page, totalPages, query, status }: Props) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1">
      {page > 1 ? (
        <Link
          href={href(page - 1, query, status)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          ← 前へ
        </Link>
      ) : (
        <span className="px-3 py-1 text-sm border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed">
          ← 前へ
        </span>
      )}
      {page < totalPages ? (
        <Link
          href={href(page + 1, query, status)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          次へ →
        </Link>
      ) : (
        <span className="px-3 py-1 text-sm border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed">
          次へ →
        </span>
      )}
    </div>
  )
}
