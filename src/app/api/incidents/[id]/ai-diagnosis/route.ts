import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_RESPONSES = 10 // 直近N件のみ送信

// 固定システムプロンプト（キャッシュ対象）
const SYSTEM_PROMPT = `あなたはトンネル工事現場のITシステム障害診断の専門アシスタントです。
映像設備（CCTV・モニター）・通信設備（無線・電話）・防災設備・計測機器などのシステム障害を扱います。

回答ルール：
- 現場担当者が即座に行動できる具体的な内容で答える
- 推測の場合は「可能性があります」と明示する
- 専門用語は避け、平易な日本語で答える
- 対応履歴に「効果なし」が続く場合は専門業者手配を優先的に提案する`

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'developer')
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: incident }, { data: allResponses }] = await Promise.all([
    (admin as any).from('incidents').select('title, category, device, general_contractor, site_name, content, status').eq('id', params.id).single(),
    (admin as any)
      .from('responses')
      .select('content, action_type, result_type, created_at')
      .eq('incident_id', params.id)
      .order('created_at', { ascending: false })
      .limit(MAX_RESPONSES),
  ])

  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

## 対応履歴（直近${responses.length}件）
${responsesText}
${noEffectCount >= 3 ? `\n※ 「効果なし」が${noEffectCount}件続いています。` : ''}

## 診断依頼
上記の情報をもとに、以下を簡潔に回答してください：

1. **考えられる原因**（2〜3つ）
2. **推奨する次の対応**（優先順に2〜3ステップ）
3. **注意点・確認事項**（1〜2つ）`

  const client = new Anthropic()

  // ストリーミング + プロンプトキャッシュ
  const stream = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    stream: true,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // @ts-ignore — cache_control は SDK で対応済みだが型定義が遅れている場合がある
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  // テキストチャンクをそのままストリームで返す
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let inputTokens = 0
      let outputTokens = 0
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
        if (event.type === 'message_delta' && event.usage) {
          outputTokens = event.usage.output_tokens
        }
        if (event.type === 'message_start' && event.message.usage) {
          inputTokens = event.message.usage.input_tokens
        }
      }
      controller.close()

      // ログ保存（ストリーム完了後、非同期・失敗しても無視）
      if (inputTokens > 0) {
        ;(admin as any).from('ai_usage_logs').insert({
          incident_id: params.id,
          used_by: user.id,
          model: MODEL,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        }).then(() => {}).catch(() => {})
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
