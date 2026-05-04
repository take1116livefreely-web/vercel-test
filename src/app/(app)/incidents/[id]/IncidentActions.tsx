'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import CategoryDeviceSelect from '@/components/CategoryDeviceSelect'
import FileList from '@/components/FileList'
import FileUpload from '@/components/FileUpload'
import { formatPhone } from '@/lib/phone'
import type { IncidentFile } from '@/lib/supabase/types'
import type { CategoryWithSystems } from '@/lib/categories'

type Status = 'open' | 'in_progress' | 'closed'

type IncidentType = 'trouble' | 'other'

type Incident = {
  id: string
  title: string
  general_contractor: string
  site_name: string
  site_contact: string | null
  phone_number: string | null
  content: string
  status: Status
  incident_type: IncidentType
  category: string | null
  device: string | null
  resolution: string | null
  created_at: string
  creator: { name: string } | null
}

type Props = {
  incident: Incident
  canEdit: boolean
  initialFiles: IncidentFile[]
  currentUserId: string
  isAdmin: boolean
  categories: CategoryWithSystems[]
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'open', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'closed', label: '解決済み' },
]

const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function IncidentActions({ incident, canEdit, initialFiles, currentUserId, isAdmin, categories }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(incident.title)
  const [contractor, setContractor] = useState(incident.general_contractor)
  const [site, setSite] = useState(incident.site_name)
  const [content, setContent] = useState(incident.content)
  const [siteContact, setSiteContact] = useState(incident.site_contact ?? '')
  const [phoneNumber, setPhoneNumber] = useState(incident.phone_number ?? '')
  const [incidentType, setIncidentType] = useState<IncidentType>(incident.incident_type)
  const [category, setCategory] = useState(incident.category ?? '')
  const [device, setDevice] = useState(incident.device ?? '')
  const [status, setStatus] = useState<Status>(incident.status)
  const [resolution, setResolution] = useState<string | null>(incident.resolution)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [resolutionInput, setResolutionInput] = useState('')
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
      body: JSON.stringify({
        title, general_contractor: contractor, site_name: site,
        site_contact: siteContact || null, phone_number: phoneNumber || null,
        content,
        category: category || null,
        device: device || null,
        incident_type: incidentType,
      }),
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

  async function handleStatusChange(newStatus: Status, resolutionText?: string) {
    setStatusChanging(true)
    const body: Record<string, string | null> = { status: newStatus }
    if (newStatus === 'closed') body.resolution = resolutionText || null
    const res = await fetch(`/api/incidents/${incident.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setStatusChanging(false)
    if (res.ok) {
      setStatus(newStatus)
      if (newStatus === 'closed') setResolution(resolutionText || null)
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={selectCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ゼネコン</label>
            <input value={contractor} onChange={(e) => setContractor(e.target.value)} className={selectCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">現場</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} className={selectCls} />
          </div>
        </div>

        {/* 案件種別 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">案件種別</label>
          <div className="flex gap-4">
            {(['trouble', 'other'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={t}
                  checked={incidentType === t}
                  onChange={() => setIncidentType(t)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{t === 'trouble' ? 'トラブル' : 'その他'}</span>
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
            className={selectCls}
            labelClassName="block text-xs font-medium text-gray-600 mb-1"
          />
        )}

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
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" className={selectCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className={`${selectCls} resize-none`} />
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

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={status} />
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
          incidentType === 'trouble'
            ? 'bg-red-50 text-red-600 border-red-200'
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          {incidentType === 'trouble' ? 'トラブル' : 'その他'}
        </span>
        <div className="flex gap-1">
          {STATUS_OPTIONS.filter((o) => o.value !== status).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                if (opt.value === 'closed' && incidentType === 'trouble') {
                  setResolutionInput('')
                  setShowResolutionModal(true)
                } else {
                  handleStatusChange(opt.value)
                }
              }}
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
        {incident.category && (
          <p><span className="font-medium">ジャンル：</span>{incident.category}</p>
        )}
        {incident.device && (
          <p><span className="font-medium">システム名：</span>{incident.device}</p>
        )}
        {incident.site_contact && (
          <p><span className="font-medium">現場担当者：</span>{incident.site_contact} 様</p>
        )}
        {incident.phone_number && (
          <p><span className="font-medium">電話番号：</span>{formatPhone(incident.phone_number)}</p>
        )}
        <p><span className="font-medium">登録者：</span>{incident.creator?.name ?? '削除済みユーザー'}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap mb-3">
        {incident.content}
      </div>
      {status === 'closed' && resolution && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap mb-3">
          <p className="text-xs font-medium text-green-700 mb-1">解決内容</p>
          {resolution}
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

      {showResolutionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">解決内容を記録する</h2>
            <textarea
              value={resolutionInput}
              onChange={(e) => setResolutionInput(e.target.value)}
              rows={4}
              placeholder="例: LANケーブルを交換して復旧"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <p className="text-xs text-gray-500">原因と結果を簡潔に記載してください。<span className="text-gray-400">（AI学習精度に影響します）</span></p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResolutionModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  setShowResolutionModal(false)
                  await handleStatusChange('closed', resolutionInput)
                }}
                disabled={statusChanging || !resolutionInput.trim()}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                解決済みにする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
