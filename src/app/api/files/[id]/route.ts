import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: file } = await admin
    .from('incident_files')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await admin.storage
    .from('incident-files')
    .createSignedUrl((file as any).storage_path, 3600)

  return NextResponse.json({ url: data?.signedUrl })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: file } = await admin
    .from('incident_files')
    .select('storage_path, uploaded_by')
    .eq('id', params.id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAdmin = (appUser as any)?.role === 'admin'
  if ((file as any).uploaded_by !== user.id && !isAdmin)
    return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })

  await admin.storage.from('incident-files').remove([(file as any).storage_path])
  await admin.from('incident_files').delete().eq('id', params.id)

  return NextResponse.json({ ok: true })
}
