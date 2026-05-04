'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ACTION_TYPES = ['確認作業', '再起動・リセット', '部品交換', '設定変更', '業者手配', 'その他'] as const
const RESULT_TYPES = ['効果なし', '部分改善', '解決'] as const

type Props = { incidentId: string; userId: string }

const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ResponseForm({ incidentId, userId }: Props) {
  const [content, setContent] = useState('')
  const [actionType, setActionType] = useState<string>('その他')
  const [resultType, setResultType] = useState<string>('効果なし')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setLoading(true)

    const { error: err } = await supabase
      .from('responses')
      .insert({
        incident_id: incidentId,
        content: content.trim(),
        responder_id: userId,
        action_type: actionType,
        result_type: resultType,
      })

    if (err) {
      setError('送信に失敗しました。')
    } else {
      setContent('')
      setActionType('その他')
      setResultType('効果なし')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-2">対応を追加</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="対応内容を入力..."
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
      />
      <div className="flex flex-wrap gap-3 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">対応種別</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={selectCls}>
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">
            結果 <span className="text-red-500">*</span>
          </label>
          <select value={resultType} onChange={(e) => setResultType(e.target.value)} className={selectCls}>
            {RESULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
        >
          {loading ? '送信中...' : '対応を追加'}
        </button>
      </div>
    </form>
  )
}
