import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((data as { role: string } | null)?.role !== 'admin') return null
  return user
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.from('systems').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
