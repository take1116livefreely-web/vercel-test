import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendInviteEmail({
  to,
  name,
  password,
  loginUrl,
}: {
  to: string
  name: string
  password: string
  loginUrl: string
}) {
  await transporter.sendMail({
    from: `"現場対応管理システム" <${process.env.SMTP_FROM}>`,
    to,
    subject: '【現場対応管理システム】アカウントが発行されました',
    text: `
${name} 様

現場対応管理システムへのアカウントが発行されました。
以下の情報でログインしてください。

ログインURL: ${loginUrl}
メールアドレス: ${to}
パスワード: ${password}

※このメールに心当たりがない場合は、このメールを無視してください。
    `.trim(),
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
          <a href="${loginUrl}" style="color:#2774C0;">${loginUrl}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#EFF4FB;font-weight:bold;border:1px solid #d1dae8;">メールアドレス</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #d1dae8;">${to}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#EFF4FB;font-weight:bold;border:1px solid #d1dae8;">パスワード</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #d1dae8;font-family:monospace;font-size:15px;letter-spacing:1px;">${password}</td>
      </tr>
    </table>

    <p style="color:#555;font-size:13px;margin:0;">
      ご不明な点は管理者へお問い合わせください。
    </p>
  </div>
</div>
    `.trim(),
  })
}
