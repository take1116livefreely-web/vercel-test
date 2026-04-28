import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TagBadge from '@/components/TagBadge'
import ResponseForm from './ResponseForm'
import ResponseList from './ResponseList'

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

  const { data: appUser } = await supabase
    .from('users').select('role').eq('id', user!.id).single()
  const isAdmin = (appUser as { role: string } | null)?.role === 'admin'

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
      <ResponseList
        responses={(responses ?? []) as any}
        currentUserId={user!.id}
        isAdmin={isAdmin}
      />

      {/* 対応追加フォーム */}
      <ResponseForm incidentId={params.id} userId={user!.id} />
    </div>
  )
}
