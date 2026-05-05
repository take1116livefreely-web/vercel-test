import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('shared_documents')
    .select('id, name, size, system_id, uploaded_by, ai_training, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, storage_path, size, system_id } = await request.json()
  if (!name || !storage_path || !size)
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('shared_documents')
    .insert({
      name,
      storage_path,
      size,
      system_id: system_id || null,
      uploaded_by: user.id,
      ai_training: false,
    })
    .select()
    .single()

  if (error) {
    await admin.storage.from('shared-documents').remove([storage_path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}
