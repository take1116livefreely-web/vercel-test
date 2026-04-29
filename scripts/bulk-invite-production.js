// 一括ユーザー登録スクリプト（本番用）
// 実行: node scripts/bulk-invite-production.js

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
// 登録するユーザー一覧（38名）
// =============================
const USERS = [
  { name: '宮原　宏史', email: 'miyahara.h@mac-net.co.jp', password: 'DpMALyOE', role: 'member' },
  { name: '小川　智史', email: 'ogawa.s@mac-net.co.jp', password: 'LGPg7QUs', role: 'member' },
  { name: '荒木 健', email: 'araki.t@mac-net.co.jp', password: '4wI3h7vD', role: 'member' },
  { name: '錦織　弘和', email: 'nishikoori.h@mac-net.co.jp', password: 'vUo8boUU', role: 'member' },
  { name: '佐々木　俊也', email: 'sasaki.s@mac-net.co.jp', password: 'iRkniwuT', role: 'member' },
  { name: '村上　和希', email: 'murakami.k@mac-net.co.jp', password: 'mmMgepoX', role: 'member' },
  { name: '千原　遥', email: 'hirata.h@mac-net.co.jp', password: '1oiHqanI', role: 'member' },
  { name: '相内　春樹', email: 'ainai.h@mac-net.co.jp', password: 'E1tQFR1c', role: 'member' },
  { name: '阿波 恭平', email: 'awa.k@mac-net.co.jp', password: '4vnd4LpK', role: 'member' },
  { name: '富川　章', email: 'tomikawa.a@mac-net.co.jp', password: 'qM8huyhN', role: 'member' },
  { name: '中山　圭', email: 'nakayama.k@mac-net.co.jp', password: 'mFa4IEhg', role: 'member' },
  { name: '小山　真槻', email: 'koyama.m@mac-net.co.jp', password: '6Nhy5TRt', role: 'member' },
  { name: '花村　正太郎', email: 'hanamura.s@mac-net.co.jp', password: 'YMqVXDla', role: 'member' },
  { name: '王　奕樵', email: 'ou.e@mac-net.co.jp', password: 'UYyNfCVk', role: 'member' },
  { name: '高橋　彪我', email: 'takahashi.hy@mac-net.co.jp', password: 'RUShiXH4', role: 'member' },
  { name: '宍倉　鷹宏', email: 'shishikura.t@mac-net.co.jp', password: 'dJydUzAC', role: 'member' },
  { name: '野﨑　舜司', email: 'nozaki.s@mac-net.co.jp', password: 'uEzPowF0', role: 'member' },
  { name: '菊池　勇太', email: 'kikuchi.y@mac-net.co.jp', password: 'vx5robe7', role: 'member' },
  { name: '浦井　健太', email: 'urai.k@mac-net.co.jp', password: 'EtVAYb5C', role: 'member' },
  { name: '生越　一光', email: 'ogose.i@mac-net.co.jp', password: 'HArdXMDF', role: 'member' },
  { name: '藤枝　永航', email: 'fujieda.e@mac-net.co.jp', password: '3ElLGDnb', role: 'member' },
  { name: '桑元　英夫', email: 'kuwamoto.h@mac-net.co.jp', password: 'AANhm6pk', role: 'member' },
  { name: '武下　行夫', email: 'takeshita.y@mac-net.co.jp', password: '6P9JIGC2', role: 'member' },
  { name: '藤沼　隆', email: 'fujinuma.t@mac-net.co.jp', password: 'pBpCGLgO', role: 'member' },
  { name: '小泉　創', email: 'koizumi.h@mac-net.co.jp', password: 'sFIr1TJZ', role: 'member' },
  { name: '戴　昊', email: 'tai.k@mac-net.co.jp', password: 'uFOhuiEg', role: 'member' },
  { name: '山東　開', email: 'santou.k@mac-net.co.jp', password: 'BTKzQ2GG', role: 'member' },
  { name: '森本　景介', email: 'morimoto.k@mac-net.co.jp', password: 'H8eIK9DO', role: 'member' },
  { name: '宮地　順吾', email: 'miyachi.j@mac-net.co.jp', password: 'eefNjkd5', role: 'member' },
  { name: '韓　国栄', email: 'han.g@mac-net.co.jp', password: 'nHfOeuCO', role: 'member' },
  { name: '花﨑　涼', email: 'hanazaki.r@mac-net.co.jp', password: '6aSTbvld', role: 'member' },
  { name: '玉木 稜也', email: 'tamaki.r@mac-net.co.jp', password: 'c3rsTDmK', role: 'member' },
  { name: '福田　優希', email: 'fukuda.y@mac-net.co.jp', password: 'MG557pFv', role: 'member' },
  { name: '叢　奇才', email: 'juu.k@mac-net.co.jp', password: 'JXDBicJc', role: 'member' },
  { name: '新藤 文子', email: 'shindou.a@mac-net.co.jp', password: 'G6rn87Zh', role: 'member' },
  { name: '古財　藍子', email: 'kozai.a@mac-net.co.jp', password: 'y9J8eiVw', role: 'member' },
  { name: '関田　文恵', email: 'sekita.f@mac-net.co.jp', password: 'ki9doXW5', role: 'member' },
  { name: '末永　久美', email: 'suenaga.k@mac-net.co.jp', password: '3H6TBDmW', role: 'member' },
]

async function inviteUser({ name, email, password, role }) {
  process.stdout.write(`[${email}] 処理中... `)

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${LOGIN_URL.replace('/login', '')}/auth/callback`,
  })
  if (error) {
    console.log(`✗ アカウント作成失敗: ${error.message}`)
    return false
  }

  await admin.auth.admin.updateUserById(data.user.id, {
    password,
    email_confirm: true,
  })

  const { error: upsertError } = await admin
    .from('users')
    .upsert({ id: data.user.id, name, role: role ?? 'member' })
  if (upsertError) {
    console.log(`✗ DB登録失敗: ${upsertError.message}`)
    return false
  }

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
    console.log('✓ 完了')
  } catch (mailErr) {
    console.log(`✓ DB登録済み（メール送信失敗: ${mailErr.message}）`)
  }

  return true
}

async function main() {
  console.log(`=== 一括ユーザー登録 本番用 ${USERS.length}名 ===\n`)
  let success = 0, failed = 0
  for (const user of USERS) {
    const ok = await inviteUser(user)
    if (ok) success++; else failed++
    await new Promise(r => setTimeout(r, 1500))
  }
  console.log(`\n=== 完了: 成功 ${success}名 / 失敗 ${failed}名 ===`)
}

main().catch(console.error)
