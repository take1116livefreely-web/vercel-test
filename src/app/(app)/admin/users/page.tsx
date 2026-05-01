import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'
import UserList from './UserList'
import type { AppUser, UserRole } from '@/lib/supabase/types'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await supabase.from('users').select('role').eq('id', user.id).single()
  const currentRole = (result.data as { role: string } | null)?.role as UserRole | undefined
  if (currentRole !== 'admin' && currentRole !== 'developer') redirect('/')

  const usersResult = await supabase.from('users').select('*').order('created_at')
  const allUsers = (usersResult.data as AppUser[] | null) ?? []

  // 開発者は一覧に表示しない。開発者本人のみ最上部に別表示
  const selfUser = currentRole === 'developer' ? allUsers.find(u => u.id === user.id) ?? null : null
  const regularUsers = allUsers
    .filter(u => u.role !== 'developer')
    .sort((a, b) => {
      if (a.role === b.role) return 0
      return a.role === 'admin' ? -1 : 1
    })

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">ユーザー管理</h1>

      {/* 開発者本人アカウント（開発者ログイン時のみ最上部に表示） */}
      {selfUser && (
        <div className="mb-6 bg-white rounded-xl border border-indigo-200 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">
              {selfUser.name}
              <span className="ml-1 text-xs text-gray-400">（あなた）</span>
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
            開発者
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">ユーザーを招待</h2>
          <InviteForm currentUserRole={currentRole} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">登録済みユーザー</h2>
          <UserList users={regularUsers} currentUserId={user.id} currentUserRole={currentRole} />
        </div>
      </div>
    </div>
  )
}
