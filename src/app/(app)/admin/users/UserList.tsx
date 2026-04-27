import type { AppUser } from '@/lib/supabase/types'

type Props = { users: AppUser[]; currentUserId: string }

export default function UserList({ users, currentUserId }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {users.length === 0 && (
        <p className="text-sm text-gray-400 p-4">ユーザーがいません</p>
      )}
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">
              {u.name}
              {u.id === currentUserId && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            {u.role === 'admin' ? '管理者' : 'メンバー'}
          </span>
        </div>
      ))}
    </div>
  )
}
