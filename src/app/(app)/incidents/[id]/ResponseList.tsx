'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TagBadge from '@/components/TagBadge'

type Response = {
  id: string
  content: string
  responder_id: string
  created_at: string
  tags: string[]
  responder: { name: string } | null
}

type Props = {
  responses: Response[]
  currentUserId: string
  isAdmin: boolean
}

export default function ResponseList({ responses, currentUserId, isAdmin }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    if (!confirm('この対応履歴を削除しますか？')) return
    setDeletingId(id)
    const res = await fetch(`/api/responses/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-3 mb-6">
      {responses.map((res) => {
        const canDelete = isAdmin || res.responder_id === currentUserId
        return (
          <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4 ml-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700">{res.responder?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">
                  {new Date(res.created_at).toLocaleString('ja-JP')}
                </p>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(res.id)}
                    disabled={deletingId === res.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === res.id ? '削除中...' : '削除'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{res.content}</p>
            {res.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {res.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
