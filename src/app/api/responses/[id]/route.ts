import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // 対象の対応履歴を取得
  const { data: response } = await admin
    .from('responses')
    .select('responder_id')
    .eq('id', params.id)
    .single()

  if (!response) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  // 自分の投稿か管理者かチェック
  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAdmin = (appUser as { role: string } | null)?.role === 'admin'
  const isOwner = (response as { responder_id: string }).responder_id === user.id

  if (!isAdmin && !isOwner) return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })

  const { error } = await admin.from('responses').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
