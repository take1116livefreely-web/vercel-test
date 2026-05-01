import { createClient } from '@/lib/supabase/server'
import type { CategoryWithSystems } from '@/lib/categories'

export async function fetchCategoriesWithSystems(): Promise<CategoryWithSystems[]> {
  const supabase = createClient()
  const [{ data: cats }, { data: systems }] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order').order('sort_order'),
    supabase.from('systems').select('id, category_id, name, sort_order').order('sort_order'),
  ])

  return (cats ?? []).map((cat) => ({
    ...cat,
    systems: (systems ?? []).filter((s: any) => s.category_id === cat.id),
  }))
}
