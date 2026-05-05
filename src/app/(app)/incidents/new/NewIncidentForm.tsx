'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CategoryDeviceSelect from '@/components/CategoryDeviceSelect'
import type { CategoryWithSystems } from '@/lib/categories'

type Props = { categories: CategoryWithSystems[] }

export default function NewIncidentForm({ categories }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [device, setDevice] = useState('')
  const [incidentType, setIncidentType] = useState<'trouble' | 'other'>('trouble')
  const [generalContractor, setGeneralContractor] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siteContact, setSiteContact] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false)

  // ref で最新値を保持（effect の stale closure 対策）
  const phoneNumberRef = useRef('')
  const phoneWasAutoFilledRef = useRef(false)
  useEffect(() => { phoneNumberRef.current = phoneNumber }, [phoneNumber])

  // ゼネコン名 + 現場名 + 現場担当者が揃ったら電話番号を照合・自動反映
  useEffect(() => {
    if (!generalContractor.trim() || !siteName.trim() || !siteContact.trim()) return
    const timer = setTimeout(async () => {
      // 入力欄の「様」を除去してDBと照合（DBはクリーニング済みで様なし）
      const cleanedContact = siteContact.trim().replace(/\s*様\s*$/, '').trim()
      if (!cleanedContact) return
      const { data } = await supabase
        .from('contacts')
        .select('phone_number')
        .eq('general_contractor', generalContractor.trim())
        .eq('site_name', siteName.trim())
        .eq('site_contact', cleanedContact)
        .not('phone_number', 'is', null)
        .limit(1) as any
      if (!data?.length) return
      const phone = (data[0] as { phone_number: string }).phone_number
      if (phone && (!phoneNumberRef.current || phoneWasAutoFilledRef.current)) {
        phoneWasAutoFilledRef.current = true
        setPhoneAutoFilled(true)
        setPhoneNumber(phone)
      }
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalContractor, siteName, siteContact])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)
    const title = data.get('title') as string
    const content = data.get('content') as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: incident, error: err } = await (supabase
      .from('incidents')
      .insert({
        title, general_contractor: generalContractor, site_name: siteName,
        site_contact: siteContact || null, phone_number: phoneNumber || null, content,
        created_by: user.id,
        category: category || null,
        device: device || null,
        incident_type: incidentType,
      })
      .select('id')
      .single() as any)

    if (err) {
      setError('登録に失敗しました。もう一度お試しください。')
    } else {
      // 連絡先テーブルに upsert（既存レコードは上書きしない）
      if (siteContact.trim() && generalContractor.trim() && siteName.trim()) {
        fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            general_contractor: generalContractor.trim(),
            site_name: siteName.trim(),
            site_contact: siteContact.trim().replace(/\s*様\s*$/, '').trim(),
            phone_number: phoneNumber.trim() || null,
          }),
        }).catch(() => {})
      }
      router.push(`/incidents/${(incident as { id: string }).id}`)
    }
    setLoading(false)
  }

  const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">新規案件登録</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">件名 <span className="text-red-500">*</span></label>
          <input name="title" required className={selectCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ゼネコン名 <span className="text-red-500">*</span></label>
            <input
              value={generalContractor}
              onChange={(e) => setGeneralContractor(e.target.value)}
              required
              className={selectCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現場名 <span className="text-red-500">*</span></label>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
              className={selectCls}
            />
          </div>
        </div>

        {/* 案件種別 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">案件種別 <span className="text-red-500">*</span></label>
          <div className="flex gap-4">
            {(['trouble', 'other'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="incident_type"
                  value={t}
                  checked={incidentType === t}
                  onChange={() => setIncidentType(t)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">
                  {t === 'trouble' ? 'トラブル' : 'その他'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {incidentType === 'trouble' && (
          <CategoryDeviceSelect
            categories={categories}
            category={category}
            device={device}
            onCategoryChange={setCategory}
            onDeviceChange={setDevice}
            required
            className={selectCls}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現場担当者</label>
            <div className="flex items-center gap-2">
              <input
                value={siteContact}
                onChange={(e) => setSiteContact(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 shrink-0">様</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号（ハイフンなし）
              {phoneAutoFilled && (
                <span className="ml-2 text-xs font-normal text-blue-500">自動入力</span>
              )}
            </label>
            <input
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                phoneWasAutoFilledRef.current = false
                setPhoneAutoFilled(false)
              }}
              type="tel"
              className={selectCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">内容 <span className="text-red-500">*</span></label>
          <textarea name="content" required rows={5} className={`${selectCls} resize-none`} />
        </div>
        {error &&<p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300">
            キャンセル
          </button>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg">
            {loading ? '登録中...' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}
