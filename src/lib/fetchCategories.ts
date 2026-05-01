import { createClient } from '@/lib/supabase/server'
import type { Category, SystemItem, CategoryWithSystems } from '@/lib/supabase/types'

export async function fetchCategoriesWithSystems(): Promise<CategoryWithSystems[]> {
  const supabase = createClient()
  const [{ data: catsRaw }, { data: sysRaw }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('systems').select('*').order('sort_order'),
  ])

  const cats = (catsRaw ?? []) as Category[]
  const sysList = (sysRaw ?? []) as SystemItem[]

  return cats.map((cat) => ({
    ...cat,
    systems: sysList.filter((s) => s.category_id === cat.id),
  }))
}
