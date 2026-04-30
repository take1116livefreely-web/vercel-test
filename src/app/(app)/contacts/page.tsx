import { createClient } from '@/lib/supabase/server'
import ContactsClient from './ContactsClient'

export default async function ContactsPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('incidents')
    .select('site_contact, phone_number, general_contractor, site_name')
    .not('site_contact', 'is', null)
    .not('phone_number', 'is', null)
    .order('created_at', { ascending: false })

  const contacts = (data ?? []) as {
    site_contact: string
    phone_number: string
    general_contractor: string
    site_name: string
  }[]

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">連絡先一覧</h1>
      <ContactsClient contacts={contacts} />
    </div>
  )
}
