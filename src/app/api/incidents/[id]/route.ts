import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTags, buildTagsFromIncident } from '@/lib/tags'

async function getPermission(incidentId: string, userId: string) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: incident } = await admin.from('incidents').select('created_by').eq('id', incidentId).single()
  if (!incident) return { allowed: false, notFound: true }
  const { data: appUser } = await supabase.from('users').select('role').eq('id', userId).single()
  const isAdmin = ['admin', 'developer'].includes((appUser as { role: string } | null)?.role ?? '')
  const isOwner = (incident as { created_by: string }).created_by === userId
  return { allowed: isAdmin || isOwner, notFound: false }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, notFound } = await getPermission(params.id, user.id)
  if (notFound) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })

  const { title, general_contractor, site_name, site_contact, phone_number, content, tagInput, category, device, incident_type } = await request.json()
  if (!title?.trim() || !general_contractor?.trim() || !site_name?.trim() || !content?.trim())
    return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })

  const extraTags = parseTags(tagInput ?? '')
  const tags = buildTagsFromIncident(general_contractor.trim(), site_name.trim(), extraTags)

  const admin = createAdminClient()
  const { error } = await admin.from('incidents').update({
    title: title.trim(), general_contractor: general_contractor.trim(),
    site_name: site_name.trim(), site_contact: site_contact ?? null,
    phone_number: phone_number ?? null, content: content.trim(), tags,
    category: category ?? null, device: device ?? null,
    incident_type: incident_type ?? 'trouble',
  }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, notFound } = await getPermission(params.id, user.id)
  if (notFound) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.from('incidents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
