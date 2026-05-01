'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseTags } from '@/lib/tags'
import TagInput from '@/components/TagInput'

type Props = { incidentId: string; userId: string }

export default function ResponseForm({ incidentId, userId }: Props) {
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setLoading(true)

    const tags = parseTags(tagInput)
    const { error: err } = await supabase
      .from('responses')
      .insert({ incident_id: incidentId, content: content.trim(), responder_id: userId, tags })

    if (err) {
      setError('送信に失敗しました。')
    } else {
      setContent('')
      setTagInput('')
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
      <TagInput
        value={tagInput}
        onChange={setTagInput}
        placeholder="#モバイル　#対応済み　など（任意）"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
      />
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
