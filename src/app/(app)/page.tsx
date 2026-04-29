import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { parseTags } from '@/lib/tags'
import TagBadge from '@/components/TagBadge'

type Props = { searchParams: { q?: string } }

export default async function HomePage({ searchParams }: Props) {
  const supabase = createClient()
  const query = searchParams.q ?? ''
  const tags = parseTags(query)

  let incidentsQuery = supabase
    .from('incidents')
    .select('*, creator:users!created_by(name)')
    .order('created_at', { ascending: false })

  if (tags.length > 0) {
    incidentsQuery = incidentsQuery.contains('tags', tags)
  }

  const { data: incidents } = await incidentsQuery

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
      <form method="get" className="mb-6">
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
        <p className="text-xs text-gray-400 mt-1">
          ハッシュタグで AND 検索できます（例：#清水 #通信不良）
        </p>
      </form>

      {/* 案件リスト */}
      <div className="space-y-3">
        {incidents?.length === 0 && (
          <p className="text-center text-gray-400 py-12">案件が見つかりません</p>
        )}
        {incidents?.map((inc) => (
          <Link
            key={inc.id}
            href={`/incidents/${inc.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{inc.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {inc.general_contractor}　／　{inc.site_name}
                </p>
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
    </div>
  )
}
