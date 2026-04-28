import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as { role: string } | null)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, role, password } = await request.json()
  if (!email || !name || !password) return NextResponse.json({ error: 'name・email・password は必須です' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 })

  const origin = new URL(request.url).origin
  const admin = createAdminClient()

  // 招待メール送信
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 仮パスワードをすぐに設定（メールリンク不要でログイン可能にする）
  await admin.auth.admin.updateUserById(data.user.id, {
    password,
    email_confirm: true,
  })

  const { error: upsertError } = await admin
    .from('users')
    .upsert({ id: data.user.id, name, role: role ?? 'member' })

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
