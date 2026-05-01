import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['admin', 'member', 'developer'] as const

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as { role: string } | null)?.role !== 'developer')
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { userId, role } = await request.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId と role は必須です' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: '無効なロールです' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: '自分自身の権限は変更できません' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ role }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
