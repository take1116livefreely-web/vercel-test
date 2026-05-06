import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('incident_favorites' as any)
    .select('incident_id')
    .eq('user_id', user.id)
    .eq('incident_id', params.id)
    .single()

  if (existing) {
    await supabase.from('incident_favorites' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('incident_id', params.id)
    return NextResponse.json({ favorited: false })
  } else {
    await supabase.from('incident_favorites' as any)
      .insert({ user_id: user.id, incident_id: params.id })
    return NextResponse.json({ favorited: true })
  }
}
