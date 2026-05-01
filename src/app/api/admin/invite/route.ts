import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInviteEmail } from '@/lib/mailer'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = (appUser as { role: string } | null)?.role
  if (callerRole !== 'admin' && callerRole !== 'developer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, role, password } = await request.json()
  if (!email || !name || !password) return NextResponse.json({ error: 'name・email・password は必須です' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 })
  if (callerRole === 'admin' && role === 'developer') return NextResponse.json({ error: '管理者は開発者アカウントを作成できません' }, { status: 403 })

  const origin = new URL(request.url).origin
  const admin = createAdminClient()

  // アカウント作成（招待メールは Supabase が送るが、リンクは使わなくてよい）
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

  // ログイン情報をメールで送信
  try {
    await sendInviteEmail({ to: email, name, password, loginUrl: `${origin}/login` })
  } catch (mailErr) {
    console.error('招待メール送信エラー:', mailErr)
    // メール送信失敗はアカウント作成自体を失敗扱いにしない
  }

  return NextResponse.json({ ok: true })
}
