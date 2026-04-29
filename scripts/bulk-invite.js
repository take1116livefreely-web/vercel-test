// 一括ユーザー登録スクリプト
// 実行: node scripts/bulk-invite.js
// 事前に .env.local に以下を設定してください:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

// .env.local を読み込む
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

const LOGIN_URL = 'https://vercel-test-two-flax.vercel.app/login'

// =============================
// 登録するユーザー一覧
// =============================
const USERS = [
  // テスト用
  { name: 'test', email: 'orehazyaian1116@gmail.com', password: '84956729', role: 'member' },
]

async function inviteUser({ name, email, password, role }) {
  console.log(`\n[${email}] 処理開始...`)

  // アカウント作成
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${LOGIN_URL.replace('/login', '')}/auth/callback`,
  })
  if (error) {
    console.error(`  ✗ アカウント作成失敗: ${error.message}`)
    return false
  }

  // パスワード設定 + メール確認済み
  await admin.auth.admin.updateUserById(data.user.id, {
    password,
    email_confirm: true,
  })

  // usersテーブルに登録
  const { error: upsertError } = await admin
    .from('users')
    .upsert({ id: data.user.id, name, role: role ?? 'member' })
  if (upsertError) {
    console.error(`  ✗ usersテーブル登録失敗: ${upsertError.message}`)
    return false
  }

  // ログイン情報メール送信
  try {
    await transporter.sendMail({
      from: `"現場対応管理システム" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: '【現場対応管理システム】アカウントが発行されました',
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
  <div style="background:#1E3A5F;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">現場対応管理システム</h2>
    <p style="color:#BBCEE8;margin:4px 0 0;font-size:13px;">アカウント発行のお知らせ</p>
  </div>
  <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">${name} 様</p>
    <p style="margin:0 0 20px;">現場対応管理システムへのアカウントが発行されました。<br>以下の情報でログインしてください。</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 14px;background:#EFF4FB;font-weight:bold;width:40%;border:1px solid #d1dae8;">ログインURL</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #d1dae8;">
          <a href="${LOGIN_URL}" style="color:#2774C0;">${LOGIN_URL}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#EFF4FB;font-weight:bold;border:1px solid #d1dae8;">メールアドレス</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #d1dae8;">${email}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#EFF4FB;font-weight:bold;border:1px solid #d1dae8;">パスワード</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #d1dae8;font-family:monospace;font-size:15px;letter-spacing:1px;">${password}</td>
      </tr>
    </table>
    <p style="color:#555;font-size:13px;margin:0;">ご不明な点は管理者へお問い合わせください。</p>
  </div>
</div>`,
    })
    console.log(`  ✓ メール送信完了`)
  } catch (mailErr) {
    console.error(`  ✗ メール送信失敗: ${mailErr.message}`)
  }

  console.log(`  ✓ 登録完了: ${name}`)
  return true
}

async function main() {
  console.log(`=== 一括ユーザー登録 (${USERS.length}名) ===`)
  let success = 0, failed = 0
  for (const user of USERS) {
    const ok = await inviteUser(user)
    if (ok) success++; else failed++
    // レート制限対策で少し待つ
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log(`\n=== 完了: 成功 ${success}名 / 失敗 ${failed}名 ===`)
}

main().catch(console.error)
