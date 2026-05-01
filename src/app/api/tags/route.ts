import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: incidents }, { data: responses }] = await Promise.all([
    admin.from('incidents').select('tags'),
    admin.from('responses').select('tags'),
  ])

  const allTags = new Set<string>()
  for (const row of incidents ?? []) (row.tags ?? []).forEach((t: string) => allTags.add(t))
  for (const row of responses ?? []) (row.tags ?? []).forEach((t: string) => allTags.add(t))

  return NextResponse.json({ tags: Array.from(allTags).sort() })
}
