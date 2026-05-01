'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseTags, buildTagsFromIncident } from '@/lib/tags'
import TagInput from '@/components/TagInput'
import CategoryDeviceSelect from '@/components/CategoryDeviceSelect'
import type { CategoryWithSystems } from '@/lib/categories'

type Props = { categories: CategoryWithSystems[] }

export default function NewIncidentForm({ categories }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [category, setCategory] = useState('')
  const [device, setDevice] = useState('')
  const [incidentType, setIncidentType] = useState<'trouble' | 'other'>('trouble')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)
    const title = data.get('title') as string
    const generalContractor = data.get('general_contractor') as string
    const siteName = data.get('site_name') as string
    const siteContact = (data.get('site_contact') as string) || null
    const phoneNumber = (data.get('phone_number') as string) || null
    const content = data.get('content') as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const extraTags = parseTags(tagInput)
    const tags = buildTagsFromIncident(generalContractor, siteName, extraTags)

    const { data: incident, error: err } = await supabase
      .from('incidents')
      .insert({
        title, general_contractor: generalContractor, site_name: siteName,
        site_contact: siteContact, phone_number: phoneNumber, content,
        created_by: user.id, tags,
        category: category || null,
        device: device || null,
        incident_type: incidentType,
      })
      .select('id')
      .single()

    if (err) {
      setError('登録に失敗しました。もう一度お試しください。')
    } else {
      router.push(`/incidents/${incident.id}`)
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
            <input name="general_contractor" required className={selectCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現場名 <span className="text-red-500">*</span></label>
            <input name="site_name" required className={selectCls} />
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

        <CategoryDeviceSelect
          categories={categories}
          category={category}
          device={device}
          onCategoryChange={setCategory}
          onDeviceChange={setDevice}
          required
          className={selectCls}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現場担当者</label>
            <div className="flex items-center gap-2">
              <input name="site_contact" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-sm text-gray-700 shrink-0">様</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号（ハイフンなし）</label>
            <input name="phone_number" type="tel" className={selectCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">内容 <span className="text-red-500">*</span></label>
          <textarea name="content" required rows={5} className={`${selectCls} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">追加タグ（任意）</label>
          <TagInput
            value={tagInput}
            onChange={setTagInput}
            placeholder="#モバイル　#通信不良　など"
            className={selectCls}
          />
          <p className="text-xs text-gray-400 mt-1">ゼネコン名・現場名は自動でタグに追加されます</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
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
