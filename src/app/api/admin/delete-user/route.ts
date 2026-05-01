import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = (appUser as { role: string } | null)?.role
  if (callerRole !== 'admin' && callerRole !== 'developer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId は必須です' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })

  const admin = createAdminClient()

  if (callerRole === 'admin') {
    const { data: targetUser } = await admin.from('users').select('role').eq('id', userId).single()
    const targetRole = (targetUser as { role: string } | null)?.role
    if (targetRole === 'admin') return NextResponse.json({ error: '管理者を削除する権限がありません' }, { status: 403 })
    if (targetRole === 'developer') return NextResponse.json({ error: '開発者を削除する権限がありません' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
