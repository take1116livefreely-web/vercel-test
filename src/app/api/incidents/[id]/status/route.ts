import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, resolution } = await request.json()
  if (!['open', 'in_progress', 'closed'].includes(status))
    return NextResponse.json({ error: '不正なステータスです' }, { status: 400 })

  const admin = createAdminClient()
  type IncidentUpdate = {
    status: 'open' | 'in_progress' | 'closed'
    closed_at?: string | null
    closed_by?: string | null
    resolution?: string | null
  }
  const update: IncidentUpdate = { status }
  if (status === 'closed') {
    update.closed_at = new Date().toISOString()
    update.closed_by = user.id
    update.resolution = resolution || null
  } else {
    update.closed_at = null
    update.closed_by = null
    update.resolution = null
  }

  const { error } = await admin.from('incidents').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
