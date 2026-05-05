import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsClient from './DocumentsClient'
import type { CategoryWithSystems } from '@/lib/supabase/types'

export default async function DocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = await supabase.from('users').select('id, role').eq('id', user!.id).single()

  const admin = createAdminClient()

  const [{ data: rawDocs }, catsRaw, sysRaw] = await Promise.all([
    (admin as any)
      .from('shared_documents')
      .select('id, name, size, system_id, uploaded_by, ai_training, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('systems').select('*').order('sort_order'),
  ])

  const cats = (catsRaw.data ?? []) as any[]
  const sysList = (sysRaw.data ?? []) as any[]
  const categories: CategoryWithSystems[] = cats.map((cat: any) => ({
    ...cat,
    systems: sysList.filter((s: any) => s.category_id === cat.id),
  }))

  const uploaderIds = [...new Set((rawDocs ?? []).map((d: any) => d.uploaded_by).filter(Boolean))]
  let uploaderMap: Record<string, string> = {}
  if (uploaderIds.length > 0) {
    const { data: uploaderRows } = await (admin as any)
      .from('users')
      .select('id, name')
      .in('id', uploaderIds)
    for (const u of (uploaderRows ?? [])) uploaderMap[u.id] = u.name
  }

  const systemMap: Record<string, string> = {}
  const systemCategoryMap: Record<string, string> = {}
  for (const s of sysList) {
    systemMap[s.id] = s.name
    const cat = cats.find((c: any) => c.id === s.category_id)
    if (cat) systemCategoryMap[s.id] = cat.name
  }

  const documents = (rawDocs ?? []).map((d: any) => ({
    ...d,
    uploaderName: d.uploaded_by ? (uploaderMap[d.uploaded_by] ?? '削除済みユーザー') : '削除済みユーザー',
    systemName: d.system_id ? (systemMap[d.system_id] ?? '') : '',
    categoryName: d.system_id ? (systemCategoryMap[d.system_id] ?? '') : '',
  }))

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">書類共有</h1>
      <DocumentsClient
        documents={documents}
        categories={categories}
        userRole={(appUser as any)?.role ?? 'member'}
        userId={(appUser as any)?.id ?? ''}
      />
    </div>
  )
}
