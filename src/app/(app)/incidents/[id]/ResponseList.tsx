'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FileList from '@/components/FileList'
import FileUpload from '@/components/FileUpload'
import type { IncidentFile } from '@/lib/supabase/types'

type ResponseWithFiles = {
  id: string
  content: string
  responder_id: string | null
  created_at: string
  responder: { name: string } | null
  files: IncidentFile[]
  action_type: string | null
  result_type: string | null
}

const ACTION_TYPES = ['確認作業', '再起動・リセット', '部品交換', '設定変更', '業者手配', 'その他'] as const
const RESULT_TYPES = ['効果なし', '部分改善', '解決'] as const

const RESULT_BADGE: Record<string, string> = {
  '効果なし': 'bg-gray-100 text-gray-500 border-gray-200',
  '部分改善': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '解決':     'bg-green-50 text-green-700 border-green-200',
}

type Props = {
  responses: ResponseWithFiles[]
  currentUserId: string
  isAdmin: boolean
}

export default function ResponseList({ responses, currentUserId, isAdmin }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editActionType, setEditActionType] = useState<string>('')
  const [editResultType, setEditResultType] = useState<string>('')
  const [filesMap, setFilesMap] = useState<Record<string, IncidentFile[]>>(
    Object.fromEntries(responses.map((r) => [r.id, r.files]))
  )
  const router = useRouter()

  function startEdit(res: ResponseWithFiles) {
    setEditingId(res.id)
    setEditContent(res.content)
    const at = res.action_type ?? ''
    setEditActionType(at)
    setEditResultType(at === '確認作業' ? '効果なし' : (res.result_type ?? ''))
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editContent,
        action_type: editActionType || null,
        result_type: editResultType || null,
      }),
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
        const resFiles = filesMap[res.id] ?? []
        return (
          <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4 ml-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-blue-700">{res.responder?.name ?? '削除済みユーザー'}</p>
                {res.action_type && (
                  <span className="text-xs px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                    {res.action_type}
                  </span>
                )}
                {res.result_type && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${RESULT_BADGE[res.result_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {res.result_type}
                  </span>
                )}
              </div>
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
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">対応種別</label>
                    <select
                      value={editActionType}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditActionType(v)
                        if (v === '確認作業') setEditResultType('効果なし')
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未選択</option>
                      {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">結果</label>
                    <select
                      value={editResultType}
                      onChange={(e) => setEditResultType(e.target.value)}
                      disabled={editActionType === '確認作業'}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">未選択</option>
                      {RESULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(res.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">保存</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded border">キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{res.content}</p>
              </>
            )}
            <div className="border-t border-gray-100 mt-3 pt-2">
              <FileList
                files={resFiles}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDeleted={(id) =>
                  setFilesMap((prev) => ({
                    ...prev,
                    [res.id]: prev[res.id].filter((f) => f.id !== id),
                  }))
                }
              />
              <FileUpload
                responseId={res.id}
                currentCount={resFiles.length}
                onUploaded={(f) =>
                  setFilesMap((prev) => ({
                    ...prev,
                    [res.id]: [...(prev[res.id] ?? []), f],
                  }))
                }
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
