import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { parseTags } from '@/lib/tags'
import TagBadge from '@/components/TagBadge'
import StatusBadge from '@/components/StatusBadge'
import SimpleNav from '@/components/SimpleNav'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 20

type Props = { searchParams: { q?: string; page?: string; status?: string } }

const STATUS_TABS = [
  { value: '', label: 'すべて' },
  { value: 'open', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'closed', label: '解決済み' },
]

export default async function HomePage({ searchParams }: Props) {
  const supabase = createClient()
  const query = searchParams.q ?? ''
  const statusFilter = searchParams.status ?? ''
  const tags = parseTags(query)
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let countQuery = supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })

  let incidentsQuery = supabase
    .from('incidents')
    .select('*, creator:users!created_by(name)')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (tags.length > 0) {
    countQuery = countQuery.contains('tags', tags)
    incidentsQuery = incidentsQuery.contains('tags', tags)
  }

  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter)
    incidentsQuery = incidentsQuery.eq('status', statusFilter)
  }

  const [{ count }, { data: incidentsRaw }] = await Promise.all([
    countQuery,
    incidentsQuery,
  ])
  const incidents = (incidentsRaw ?? []) as any[]

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  function tabHref(s: string) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (s) p.set('status', s)
    return `/?${p.toString()}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">案件一覧</h1>
        <Link
          href="/incidents/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          ＋ 新規案件
        </Link>
      </div>

      {/* 検索バー */}
      <form method="get" className="mb-2">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="#清水　#モバイル　#通信不良"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            検索
          </button>
        </div>
        {/* ヒントテキストと右上ナビ */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">
            ハッシュタグで AND 検索できます（例：#清水 #通信不良）
          </p>
          <SimpleNav page={currentPage} totalPages={totalPages} query={query} status={statusFilter || undefined} />
        </div>
      </form>

      {/* ステータスタブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 総件数 */}
      <div className="mb-3">
        {totalCount === 0 ? (
          <p className="text-sm text-gray-400">
            {query ? `「${query}」の検索結果：0 件` : '案件が登録されていません'}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {query ? `「${query}」の検索結果：` : ''}
            全 {totalCount.toLocaleString()} 件（{totalPages} ページ）
          </p>
        )}
      </div>

      {/* 案件リスト */}
      <div className="space-y-3">
        {incidents.length === 0 && (
          <p className="text-center text-gray-400 py-12">案件が見つかりません</p>
        )}
        {incidents.map((inc) => (
          <Link
            key={inc.id}
            href={`/incidents/${inc.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-800 truncate">{inc.title}</p>
                  <StatusBadge status={inc.status ?? 'open'} />
                </div>
                <p className="text-sm text-gray-500">
                  {inc.general_contractor}　／　{inc.site_name}
                </p>
                {(inc.category || inc.device) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[inc.category, inc.device].filter(Boolean).join('　›　')}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(inc.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
            {inc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {inc.tags.map((tag: string) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* 下部ページネーション */}
      <Pagination page={currentPage} totalPages={totalPages} query={query} status={statusFilter || undefined} />
    </div>
  )
}
