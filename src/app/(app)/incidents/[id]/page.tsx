import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TagBadge from '@/components/TagBadge'
import ResponseForm from './ResponseForm'

type Props = { params: { id: string } }

export default async function IncidentPage({ params }: Props) {
  const supabase = createClient()

  const { data: incident } = await supabase
    .from('incidents')
    .select('*, creator:users!created_by(name)')
    .eq('id', params.id)
    .single()

  if (!incident) notFound()

  const { data: responses } = await supabase
    .from('responses')
    .select('*, responder:users!responder_id(name)')
    .eq('incident_id', params.id)
    .order('created_at', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      {/* 案件ヘッダー */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h1 className="text-xl font-bold text-gray-800">{incident.title}</h1>
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(incident.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="text-sm text-gray-600 mb-3 space-y-1">
          <p><span className="font-medium">ゼネコン：</span>{incident.general_contractor}</p>
          <p><span className="font-medium">現場：</span>{incident.site_name}</p>
          <p><span className="font-medium">登録者：</span>{(incident.creator as any)?.name}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap mb-3">
          {incident.content}
        </div>
        {incident.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {incident.tags.map((tag: string) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      {/* 対応履歴スレッド */}
      <div className="space-y-3 mb-6">
        {responses?.map((res) => (
          <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4 ml-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700">{(res.responder as any)?.name}</p>
              <p className="text-xs text-gray-400">
                {new Date(res.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{res.content}</p>
            {res.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {res.tags.map((tag: string) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 対応追加フォーム */}
      <ResponseForm incidentId={params.id} userId={user!.id} />
    </div>
  )
}
