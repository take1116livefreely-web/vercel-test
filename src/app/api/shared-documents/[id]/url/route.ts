import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: doc } = await (admin as any)
    .from('shared_documents')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await admin.storage
    .from('shared-documents')
    .createSignedUrl((doc as any).storage_path, 3600)

  return NextResponse.json({ url: data?.signedUrl })
}
