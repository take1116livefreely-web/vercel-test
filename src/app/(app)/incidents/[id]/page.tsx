import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResponseForm from './ResponseForm'
import ResponseList from './ResponseList'
import IncidentActions from './IncidentActions'
import type { IncidentFile } from '@/lib/supabase/types'

type Props = { params: { id: string } }

export default async function IncidentPage({ params }: Props) {
  const supabase = createClient()

  const [
    { data: incidentRaw },
    { data: responses },
    { data: { user } },
    { data: incidentFiles },
  ] = await Promise.all([
    supabase.from('incidents').select('*, creator:users!created_by(name)').eq('id', params.id).single(),
    supabase.from('responses').select('*, responder:users!responder_id(name)').eq('incident_id', params.id).order('created_at', { ascending: true }),
    supabase.auth.getUser(),
    supabase.from('incident_files').select('*').eq('incident_id', params.id).is('response_id', null).order('created_at', { ascending: true }),
  ])

  const incident = incidentRaw as any
  if (!incident) notFound()

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user!.id).single()
  const isAdmin = (appUser as { role: string } | null)?.role === 'admin'
  const canEdit = isAdmin || incident.created_by === user!.id

  // 対応履歴ごとのファイルを取得
  const responseIds = (responses ?? []).map((r: any) => r.id)
  const { data: responseFiles } = responseIds.length > 0
    ? await supabase.from('incident_files').select('*').in('response_id', responseIds).order('created_at', { ascending: true })
    : { data: [] }

  const responseFilesMap = (responseFiles ?? []).reduce((acc: Record<string, IncidentFile[]>, f: any) => {
    if (!acc[f.response_id]) acc[f.response_id] = []
    acc[f.response_id].push(f)
    return acc
  }, {})

  const responsesWithFiles = (responses ?? []).map((r: any) => ({
    ...r,
    files: responseFilesMap[r.id] ?? [],
  }))

  return (
    <div>
      <IncidentActions
        incident={{
          id: incident.id,
          title: incident.title,
          general_contractor: incident.general_contractor,
          site_name: incident.site_name,
          site_contact: incident.site_contact ?? null,
          phone_number: incident.phone_number ?? null,
          content: incident.content,
          tags: incident.tags,
          status: incident.status ?? 'open',
          created_at: incident.created_at,
          creator: incident.creator ?? null,
        }}
        canEdit={canEdit}
        initialFiles={(incidentFiles ?? []) as IncidentFile[]}
        currentUserId={user!.id}
        isAdmin={isAdmin}
      />

      <ResponseList
        responses={responsesWithFiles as any}
        currentUserId={user!.id}
        isAdmin={isAdmin}
      />

      <ResponseForm incidentId={params.id} userId={user!.id} />
    </div>
  )
}
