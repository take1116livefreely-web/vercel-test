import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResponseForm from './ResponseForm'
import ResponseList from './ResponseList'
import IncidentActions from './IncidentActions'

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
  const canEdit = isAdmin || (incident as any).created_by === user!.id

  return (
    <div>
      <IncidentActions
        incident={{
          id: incident.id,
          title: incident.title,
          general_contractor: incident.general_contractor,
          site_name: incident.site_name,
          content: incident.content,
          tags: incident.tags,
          created_at: incident.created_at,
          creator: (incident.creator as any) ?? null,
        }}
        canEdit={canEdit}
      />

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
