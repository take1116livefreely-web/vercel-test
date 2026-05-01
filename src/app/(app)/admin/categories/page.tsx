import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchCategoriesWithSystems } from '@/lib/fetchCategories'
import CategoriesClient from './CategoriesClient'

export default async function AdminCategoriesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await supabase.from('users').select('role').eq('id', user.id).single()
  const appUser = result.data as { role: string } | null
  if (appUser?.role !== 'admin' && appUser?.role !== 'developer') redirect('/')

  const categories = await fetchCategoriesWithSystems()

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">ジャンル・システム名管理</h1>
      <CategoriesClient categories={categories} />
    </div>
  )
}
