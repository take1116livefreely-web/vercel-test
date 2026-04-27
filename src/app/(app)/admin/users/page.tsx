import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'
import UserList from './UserList'
import type { AppUser } from '@/lib/supabase/types'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appUser } = await (supabase as any).from('users').select('role').eq('id', user.id).single()
  if (appUser?.role !== 'admin') redirect('/')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase as any).from('users').select('*').order('created_at')

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
          <UserList users={(users ?? []) as AppUser[]} currentUserId={user.id} />
        </div>
      </div>
    </div>
  )
}
