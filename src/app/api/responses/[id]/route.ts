import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getPermission(responseId: string, userId: string) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: response } = await admin.from('responses').select('responder_id').eq('id', responseId).single()
  if (!response) return { allowed: false, notFound: true }
  const { data: appUser } = await supabase.from('users').select('role').eq('id', userId).single()
  const isAdmin = ['admin', 'developer'].includes((appUser as { role: string } | null)?.role ?? '')
  const isOwner = (response as { responder_id: string }).responder_id === userId
  return { allowed: isAdmin || isOwner, notFound: false }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, notFound } = await getPermission(params.id, user.id)
  if (notFound) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })

  const { content, action_type, result_type } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: '内容は必須です' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('responses').update({
    content: content.trim(),
    ...(action_type !== undefined && { action_type }),
    ...(result_type !== undefined && { result_type }),
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
  const { error } = await admin.from('responses').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
