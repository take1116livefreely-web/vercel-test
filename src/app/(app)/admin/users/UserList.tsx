'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppUser } from '@/lib/supabase/types'

type Props = { users: AppUser[]; currentUserId: string }

export default function UserList({ users, currentUserId }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const router = useRouter()

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return
    setDeletingId(userId)
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setDeletingId(null)
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  async function handleSetPassword(userId: string) {
    setPasswordMsg('')
    const res = await fetch('/api/admin/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    const json = await res.json()
    if (res.ok) {
      setPasswordMsg('設定しました')
      setPassword('')
    } else {
      setPasswordMsg(json.error ?? '失敗しました')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {users.length === 0 && (
        <p className="text-sm text-gray-400 p-4">ユーザーがいません</p>
      )}
      {users.map((u) => (
        <div key={u.id} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {u.name}
                {u.id === currentUserId && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                {u.role === 'admin' ? '管理者' : 'メンバー'}
              </span>
              <button
                onClick={() => { setPasswordUserId(passwordUserId === u.id ? null : u.id); setPasswordMsg(''); setPassword('') }}
                className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:border-blue-400"
              >
                仮PW設定
              </button>
              {u.id !== currentUserId && (
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  disabled={deletingId === u.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-2 py-0.5 rounded border border-red-200 hover:border-red-400"
                >
                  {deletingId === u.id ? '削除中...' : '削除'}
                </button>
              )}
            </div>
          </div>
          {passwordUserId === u.id && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="仮パスワード（6文字以上）"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSetPassword(u.id)}
                disabled={password.length < 6}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded"
              >
                設定
              </button>
              {passwordMsg && (
                <span className={`text-xs ${passwordMsg === '設定しました' ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMsg}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
