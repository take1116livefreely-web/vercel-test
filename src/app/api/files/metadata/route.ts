import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILES = 5

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { incident_id, response_id, storage_path, name, mime_type, size } = await request.json()
  if (!storage_path || !name || (!incident_id && !response_id))
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })

  const admin = createAdminClient()
  const parentCol = incident_id ? 'incident_id' : 'response_id'
  const parentId = incident_id ?? response_id

  const { count } = await admin
    .from('incident_files')
    .select('*', { count: 'exact', head: true })
    .eq(parentCol, parentId)

  if ((count ?? 0) >= MAX_FILES)
    return NextResponse.json({ error: `ファイルは${MAX_FILES}件までです` }, { status: 400 })

  const { data, error } = await admin
    .from('incident_files')
    .insert({
      incident_id: incident_id ?? null,
      response_id: response_id ?? null,
      storage_path,
      name,
      mime_type: mime_type || 'application/octet-stream',
      size,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    await admin.storage.from('incident-files').remove([storage_path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ file: data })
}
