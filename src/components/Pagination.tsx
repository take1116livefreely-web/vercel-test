import Link from 'next/link'

type Props = {
  page: number
  totalPages: number
  query: string
}

function href(page: number, query: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('page', String(page))
  return `/?${params.toString()}`
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 2, current - 1, current, current + 1, current + 2, '...', total)
  }

  return pages
}

export default function Pagination({ page, totalPages, query }: Props) {
  if (totalPages <= 1) return null

  const pages = pageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1 mt-8 mb-4">
      {page > 1 ? (
        <Link
          href={href(page - 1, query)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          ← 前へ
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed">
          ← 前へ
        </span>
      )}

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-gray-400">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={href(p, query)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={href(page + 1, query)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          次へ →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed">
          次へ →
        </span>
      )}
    </div>
  )
}
