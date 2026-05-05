import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 案件登録時に連絡先を upsert（既存レコードは上書きしない）
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { general_contractor, site_name, site_contact, phone_number } = await request.json()
  if (!general_contractor || !site_name || !site_contact)
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('contacts')
    .upsert(
      { general_contractor, site_name, site_contact, phone_number: phone_number || null },
      { onConflict: 'general_contractor,site_name,site_contact', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
