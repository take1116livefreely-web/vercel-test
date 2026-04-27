import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'
import UserList from './UserList'
import type { AppUser } from '@/lib/supabase/types'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await supabase.from('users').select('role').eq('id', user.id).single()
  const appUser = result.data as { role: string } | null
  if (appUser?.role !== 'admin') redirect('/')

  const usersResult = await supabase.from('users').select('*').order('created_at')
  const users = usersResult.data as AppUser[] | null

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">ユーザー管理</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">ユーザーを招待</h2>
          <InviteForm />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">登録済みユーザー</h2>
          <UserList users={users ?? []} currentUserId={user.id} />
        </div>
      </div>
    </div>
  )
}
