import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_RESPONSES = 10

const SYSTEM_PROMPT = `あなたはトンネル工事現場のITシステム障害診断の専門アシスタントです。
映像設備（CCTV・モニター）・通信設備（無線・電話）・防災設備・計測機器などのシステム障害を扱います。

回答ルール：
- 現場担当者が即座に行動できる具体的な内容で答える
- 推測の場合は「可能性があります」と明示する
- 専門用語は避け、平易な日本語で答える
- 対応履歴に「効果なし」が続く場合は専門業者手配を優先的に提案する`

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
  return await _handle(_, params)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `[未捕捉] ${msg}` }, { status: 500 })
  }
}

async function _handle(_: Request, params: { id: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'developer')
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: incident }, { data: allResponses }] = await Promise.all([
    (admin as any).from('incidents').select('title, category, device, general_contractor, site_name, content, status, incident_type, resolution').eq('id', params.id).single(),
    (admin as any)
      .from('responses')
      .select('content, action_type, result_type, created_at')
      .eq('incident_id', params.id)
      .order('created_at', { ascending: false })
      .limit(MAX_RESPONSES),
  ])

  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // trouble 案件のみ AI 診断を適用
  if (incident.incident_type !== 'trouble')
    return NextResponse.json({ error: 'AI診断はトラブル案件のみ利用できます' }, { status: 400 })

  // 対応履歴を古い順に並び替えて整形
  const responses = ((allResponses ?? []) as any[]).reverse()
  const noEffectCount = responses.filter((r) => r.result_type === '効果なし').length
  const responsesText = responses.length > 0
    ? responses.map((r, i) =>
        `[${i + 1}] ${r.action_type ?? '種別不明'}: ${r.content}（結果: ${r.result_type ?? '未記録'}）`
      ).join('\n')
    : 'なし'

  const userPrompt = `## 案件情報
- タイトル: ${incident.title}
- ステータス: ${incident.status}
- ジャンル: ${incident.category ?? '未設定'}
- システム名: ${incident.device ?? '未設定'}
- ゼネコン / 現場: ${incident.general_contractor} / ${incident.site_name}
- 障害内容: ${incident.content}
${incident.resolution ? `- 解決内容: ${incident.resolution}` : ''}
## 対応履歴（直近${responses.length}件）
${responsesText}
${noEffectCount >= 3 ? `\n※ 「効果なし」が${noEffectCount}件続いています。` : ''}

## 診断依頼
上記の情報をもとに、以下を簡潔に回答してください：

1. **考えられる原因**（2〜3つ）
2. **推奨する次の対応**（優先順に2〜3ステップ）
3. **注意点・確認事項**（1〜2つ）`

  const client = new Anthropic()

  let stream
  try {
    stream = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '不明なエラー'
    return NextResponse.json({ error: `AI診断に失敗しました: ${msg}` }, { status: 500 })
  }

  // ログをストリーミング開始前にメインハンドラで保存（確実に実行される）
  // トークン数は文字数から推定（日本語: 約2文字=1トークン）
  const estimatedInputTokens = Math.ceil((SYSTEM_PROMPT.length + userPrompt.length) / 2)
  try {
    await (admin as any).from('ai_usage_logs').insert({
      incident_id: params.id,
      used_by: user.id,
      model: MODEL,
      input_tokens: estimatedInputTokens,
      output_tokens: 800,
    })
  } catch { }

  // テキストチャンクをストリームで返す（ログ保存は完了済み）
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch { }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

