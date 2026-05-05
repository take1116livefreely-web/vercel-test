import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'admin' && (appUser as any)?.role !== 'developer')
    return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const { data: doc } = await (admin as any)
    .from('shared_documents')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin.storage.from('shared-documents').remove([(doc as any).storage_path])
  await (admin as any).from('shared_documents').delete().eq('id', params.id)

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'developer')
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { ai_training } = await request.json()

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('shared_documents')
    .update({ ai_training: Boolean(ai_training) })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
