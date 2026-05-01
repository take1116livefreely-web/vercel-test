'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/lib/supabase/types'

export default function Navbar({ user }: { user: AppUser }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-bold text-blue-600">現場対応管理</Link>
      <div className="flex items-center gap-4">
        <Link href="/contacts" className="text-sm text-gray-600 hover:text-blue-600">
          連絡先
        </Link>
        {(user.role === 'admin' || user.role === 'developer') && (
          <>
            <Link href="/admin/categories" className="text-sm text-gray-600 hover:text-blue-600">
              カテゴリ管理
            </Link>
            <Link href="/admin/users" className="text-sm text-gray-600 hover:text-blue-600">
              ユーザー管理
            </Link>
          </>
        )}
        <span className="text-sm text-gray-500">{user.name}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600"
        >
          ログアウト
        </button>
      </div>
    </nav>
  )
}
