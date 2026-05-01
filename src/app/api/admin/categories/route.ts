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

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ジャンル名を入力してください' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = ((last as any)?.sort_order ?? 0) + 1

  const { error } = await admin.from('categories').insert({ name: name.trim(), sort_order })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
