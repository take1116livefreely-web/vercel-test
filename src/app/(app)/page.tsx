import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import SimpleNav from '@/components/SimpleNav'
import Pagination from '@/components/Pagination'
import FavoriteButton from '@/components/FavoriteButton'

const PAGE_SIZE = 20

type Props = { searchParams: { q?: string; page?: string; status?: string; type?: string; fav?: string } }

const STATUS_TABS = [
  { value: '', label: 'すべて' },
  { value: 'open', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'closed', label: '解決済み' },
]

const TYPE_TABS = [
  { value: '', label: 'すべて' },
  { value: 'trouble', label: 'トラブル' },
  { value: 'other', label: 'その他' },
]

export default async function HomePage({ searchParams }: Props) {
  const supabase = createClient()
  const query = searchParams.q ?? ''
  const statusFilter = searchParams.status ?? ''
  const typeFilter = searchParams.type ?? ''
  const favFilter = searchParams.fav === '1'
  const keywords = query.trim().split(/\s+/).filter(Boolean)
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: { user } } = await supabase.auth.getUser()

  // お気に入りID一覧（常に取得してスター表示に使用）
  const { data: favData } = user
    ? await supabase.from('incident_favorites' as any).select('incident_id').eq('user_id', user.id)
    : { data: [] }
  const favoriteIds = new Set(((favData ?? []) as any[]).map((f) => f.incident_id))

  let countQuery = supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })

  let incidentsQuery = supabase
    .from('incidents')
    .select('*, creator:users!created_by(name)')
    .order('created_at', { ascending: false })
    .range(from, to)

  // キーワードごとに title・ゼネコン・現場名・内容・short_id を横断 AND 検索
  for (const kw of keywords) {
    const p = `%${kw.replace(/[%_\\]/g, '\\$&')}%`
    const or = `title.ilike.${p},general_contractor.ilike.${p},site_name.ilike.${p},content.ilike.${p},site_contact.ilike.${p},short_id.ilike.${p}`
    countQuery = countQuery.or(or)
    incidentsQuery = incidentsQuery.or(or)
  }

  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter)
    incidentsQuery = incidentsQuery.eq('status', statusFilter)
  }

  if (typeFilter) {
    countQuery = countQuery.eq('incident_type', typeFilter)
    incidentsQuery = incidentsQuery.eq('incident_type', typeFilter)
  }

  // お気に入りフィルター
  if (favFilter && user) {
    const favIncidentIds = Array.from(favoriteIds) as string[]
    if (favIncidentIds.length === 0) {
      // お気に入りが0件の場合は空を返す
      return (
        <div>
          <FavHeader query={query} statusFilter={statusFilter} typeFilter={typeFilter} />
          <p className="text-center text-gray-400 py-12">お気に入りに登録された案件がありません</p>
        </div>
      )
    }
    countQuery = countQuery.in('id', favIncidentIds)
    incidentsQuery = incidentsQuery.in('id', favIncidentIds)
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
    if (typeFilter) p.set('type', typeFilter)
    if (favFilter) p.set('fav', '1')
    return `/?${p.toString()}`
  }

  function typeTabHref(t: string) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (statusFilter) p.set('status', statusFilter)
    if (t) p.set('type', t)
    if (favFilter) p.set('fav', '1')
    return `/?${p.toString()}`
  }

  function favHref(on: boolean) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (statusFilter) p.set('status', statusFilter)
    if (typeFilter) p.set('type', typeFilter)
    if (on) p.set('fav', '1')
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
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
        {favFilter && <input type="hidden" name="fav" value="1" />}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="清水　通信不良　A3B7 など"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            検索
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">
            スペース区切りで AND 検索（ID検索可：例 A3B7）
          </p>
          <SimpleNav page={currentPage} totalPages={totalPages} query={query} status={statusFilter || undefined} />
        </div>
      </form>

      {/* ステータスタブ */}
      <div className="flex gap-1 mb-2 border-b border-gray-200">
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

      {/* 種別フィルター ＋ お気に入りフィルター */}
      <div className="flex items-center gap-1 mb-4">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={typeTabHref(tab.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === tab.value
                ? tab.value === 'trouble'
                  ? 'bg-red-50 text-red-600 border-red-300'
                  : tab.value === 'other'
                  ? 'bg-gray-100 text-gray-600 border-gray-300'
                  : 'bg-blue-50 text-blue-600 border-blue-300'
                : 'text-gray-400 border-gray-200 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        <span className="ml-auto">
          <Link
            href={favHref(!favFilter)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              favFilter
                ? 'bg-yellow-50 text-yellow-600 border-yellow-300'
                : 'text-gray-400 border-gray-200 hover:text-yellow-500'
            }`}
          >
            {favFilter ? '★' : '☆'} お気に入り
          </Link>
        </span>
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
          <div key={inc.id} className="relative bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition">
            <Link
              href={`/incidents/${inc.id}`}
              className="block p-4 pr-10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-semibold text-gray-800 truncate">{inc.title}</p>
                    <StatusBadge status={inc.status ?? 'open'} />
                    {inc.incident_type === 'other' && (
                      <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200 shrink-0">その他</span>
                    )}
                    {inc.short_id && (
                      <span className="font-mono text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">{inc.short_id}</span>
                    )}
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
            </Link>
            <div className="absolute top-3 right-3">
              <FavoriteButton incidentId={inc.id} isFavorited={favoriteIds.has(inc.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* 下部ページネーション */}
      <Pagination page={currentPage} totalPages={totalPages} query={query} status={statusFilter || undefined} />
    </div>
  )
}

// お気に入り0件時の早期returnで使うヘッダー部品
function FavHeader({ query, statusFilter, typeFilter }: { query: string; statusFilter: string; typeFilter: string }) {
  function favHref(on: boolean) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (statusFilter) p.set('status', statusFilter)
    if (typeFilter) p.set('type', typeFilter)
    if (on) p.set('fav', '1')
    return `/?${p.toString()}`
  }
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-bold">お気に入り</h1>
      <Link href={favHref(false)} className="text-sm text-gray-500 hover:text-gray-700">← 全件表示</Link>
    </div>
  )
}
