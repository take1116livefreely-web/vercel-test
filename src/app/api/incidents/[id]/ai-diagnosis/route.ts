import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'developer')
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: incident }, { data: responses }] = await Promise.all([
    (admin as any).from('incidents').select('*').eq('id', params.id).single(),
    (admin as any)
      .from('responses')
      .select('content, action_type, result_type, created_at')
      .eq('incident_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const incidentInfo = [
    `タイトル: ${incident.title}`,
    `ジャンル: ${incident.category ?? '未設定'}`,
    `システム名: ${incident.device ?? '未設定'}`,
    `ゼネコン: ${incident.general_contractor}`,
    `現場: ${incident.site_name}`,
    `内容: ${incident.content}`,
  ].join('\n')

  const responsesText = (responses ?? []).length > 0
    ? (responses as any[]).map((r, i) =>
        `対応${i + 1}: [${r.action_type ?? '種別不明'}] ${r.content}（結果: ${r.result_type ?? '未記録'}）`
      ).join('\n')
    : '対応履歴なし'

  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `あなたはトンネル工事現場のITシステム障害を支援するアシスタントです。
以下の案件を分析し、日本語で簡潔に回答してください。

【案件情報】
${incidentInfo}

【対応履歴】
${responsesText}

次の3点を箇条書きで回答してください：
1. 考えられる原因（2〜3つ）
2. 推奨する次の対応手順（2〜3ステップ）
3. 確認すべき注意点（1〜2つ）

現場担当者がすぐ動ける内容で、簡潔にお願いします。`,
      },
    ],
  })

  const diagnosis = message.content[0].type === 'text' ? message.content[0].text : ''

  // トークン使用量をログ（失敗しても診断結果には影響させない）
  try {
    await (admin as any).from('ai_usage_logs').insert({
      incident_id: params.id,
      used_by: user.id,
      model: 'claude-haiku-4-5-20251001',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    })
  } catch (_) {}

  return NextResponse.json({ diagnosis })
}
