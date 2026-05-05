import { createClient } from '@/lib/supabase/server'
import ContactsClient from './ContactsClient'

export default async function ContactsPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('contacts')
    .select('id, site_contact, phone_number, general_contractor, site_name')
    .not('phone_number', 'is', null)
    .order('general_contractor', { ascending: true })
    .order('site_name', { ascending: true })
    .order('site_contact', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">連絡先一覧</h1>
      <ContactsClient contacts={(data ?? []) as any} />
    </div>
  )
}
