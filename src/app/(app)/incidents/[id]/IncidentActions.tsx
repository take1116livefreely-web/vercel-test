'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TagBadge from '@/components/TagBadge'
import StatusBadge from '@/components/StatusBadge'
import TagInput from '@/components/TagInput'
import FileList from '@/components/FileList'
import FileUpload from '@/components/FileUpload'
import { formatPhone } from '@/lib/phone'
import type { IncidentFile } from '@/lib/supabase/types'

type Status = 'open' | 'in_progress' | 'closed'

type Incident = {
  id: string
  title: string
  general_contractor: string
  site_name: string
  site_contact: string | null
  phone_number: string | null
  content: string
  tags: string[]
  status: Status
  created_at: string
  creator: { name: string } | null
}

type Props = {
  incident: Incident
  canEdit: boolean
  initialFiles: IncidentFile[]
  currentUserId: string
  isAdmin: boolean
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'open', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'closed', label: '解決済み' },
]

export default function IncidentActions({ incident, canEdit, initialFiles, currentUserId, isAdmin }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(incident.title)
  const [contractor, setContractor] = useState(incident.general_contractor)
  const [site, setSite] = useState(incident.site_name)
  const [content, setContent] = useState(incident.content)
  const [tagInput, setTagInput] = useState(
    incident.tags
      .filter((t) => t !== incident.general_contractor && t !== incident.site_name)
      .map((t) => `#${t}`)
      .join(' ')
  )
  const [siteContact, setSiteContact] = useState(incident.site_contact ?? '')
  const [phoneNumber, setPhoneNumber] = useState(incident.phone_number ?? '')
  const [status, setStatus] = useState<Status>(incident.status)
  const [statusChanging, setStatusChanging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [files, setFiles] = useState<IncidentFile[]>(initialFiles)
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/incidents/${incident.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, general_contractor: contractor, site_name: site, site_contact: siteContact || null, phone_number: phoneNumber || null, content, tagInput }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '編集に失敗しました')
    }
  }

  async function handleDelete() {
    if (!confirm('この案件を削除しますか？\n関連する対応履歴もすべて削除されます。')) return
    setDeleting(true)
    const res = await fetch(`/api/incidents/${incident.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/')
    } else {
      setDeleting(false)
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  async function handleStatusChange(newStatus: Status) {
    setStatusChanging(true)
    const res = await fetch(`/api/incidents/${incident.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setStatusChanging(false)
    if (res.ok) {
      setStatus(newStatus)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? 'ステータス変更に失敗しました')
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ゼネコン</label>
            <input value={contractor} onChange={(e) => setContractor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">現場</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">現場担当者</label>
            <div className="flex items-center gap-2">
              <input value={siteContact} onChange={(e) => setSiteContact(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-sm text-gray-700 shrink-0">様</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">電話番号（ハイフンなし）</label>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">追加タグ</label>
          <TagInput
            value={tagInput}
            onChange={setTagInput}
            placeholder="#タグ1 #タグ2"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg">
            {saving ? '保存中...' : '保存'}
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border">キャンセル</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h1 className="text-xl font-bold text-gray-800">{incident.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(incident.created_at).toLocaleString('ja-JP')}
          </p>
          {canEdit && (
            <>
              <button onClick={() => setEditing(true)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded border border-blue-200">編集</button>
              <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-2 py-0.5 rounded border border-red-200">
                {deleting ? '削除中...' : '削除'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ステータス */}
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={status} />
        <div className="flex gap-1">
          {STATUS_OPTIONS.filter((o) => o.value !== status).map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={statusChanging}
              className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 rounded border border-gray-200 hover:border-blue-300 disabled:opacity-50"
            >
              {opt.label}へ
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p><span className="font-medium">ゼネコン：</span>{incident.general_contractor}</p>
        <p><span className="font-medium">現場：</span>{incident.site_name}</p>
        {incident.site_contact && (
          <p><span className="font-medium">現場担当者：</span>{incident.site_contact} 様</p>
        )}
        {incident.phone_number && (
          <p><span className="font-medium">電話番号：</span>{formatPhone(incident.phone_number)}</p>
        )}
        <p><span className="font-medium">登録者：</span>{incident.creator?.name}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap mb-3">
        {incident.content}
      </div>
      {incident.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {incident.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}
      <div className="border-t border-gray-100 pt-3">
        <FileList
          files={files}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDeleted={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
        />
        <FileUpload
          incidentId={incident.id}
          currentCount={files.length}
          onUploaded={(f) => setFiles((prev) => [...prev, f])}
        />
      </div>
    </div>
  )
}
