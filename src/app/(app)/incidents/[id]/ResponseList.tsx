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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTagInput, setEditTagInput] = useState('')
  const router = useRouter()

  function startEdit(res: Response) {
    setEditingId(res.id)
    setEditContent(res.content)
    setEditTagInput(res.tags.map((t) => `#${t}`).join(' '))
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent, tagInput: editTagInput }),
    })
    if (res.ok) {
      setEditingId(null)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '編集に失敗しました')
    }
  }

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
        const canEdit = isAdmin || res.responder_id === currentUserId
        return (
          <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4 ml-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700">{res.responder?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">
                  {new Date(res.created_at).toLocaleString('ja-JP')}
                </p>
                {canEdit && editingId !== res.id && (
                  <>
                    <button onClick={() => startEdit(res)} className="text-xs text-blue-400 hover:text-blue-600">編集</button>
                    <button onClick={() => handleDelete(res.id)} disabled={deletingId === res.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
                      {deletingId === res.id ? '削除中...' : '削除'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingId === res.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <input
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  placeholder="#タグ1 #タグ2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(res.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">保存</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded border">キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{res.content}</p>
                {res.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {res.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
