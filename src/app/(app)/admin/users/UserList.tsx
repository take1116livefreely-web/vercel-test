'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppUser, UserRole } from '@/lib/supabase/types'

type Props = { users: AppUser[]; currentUserId: string; currentUserRole: UserRole }

function canDelete(callerRole: UserRole, target: AppUser, currentUserId: string): boolean {
  if (target.id === currentUserId) return false
  if (callerRole === 'developer') return true
  if (callerRole === 'admin') return target.role === 'member'
  return false
}

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  developer: { label: '開発者', cls: 'bg-indigo-100 text-indigo-700' },
  admin:     { label: '管理者', cls: 'bg-purple-100 text-purple-700' },
  member:    { label: 'メンバー', cls: 'bg-gray-100 text-gray-600' },
}

export default function UserList({ users, currentUserId, currentUserRole }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {users.length === 0 && (
        <p className="text-sm text-gray-400 p-4">ユーザーがいません</p>
      )}
      {users.map((u) => {
        const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.member
        return (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {u.name}
                {u.id === currentUserId && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                {badge.label}
              </span>
              {canDelete(currentUserRole, u, currentUserId) && (
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
        )
      })}
    </div>
  )
}
