'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/phone'

type Contact = {
  id: string
  site_contact: string
  phone_number: string | null
  general_contractor: string
  site_name: string
}

const inputCls = 'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSiteContact, setEditSiteContact] = useState('')
  const [editPhoneNumber, setEditPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const results = useMemo(() => {
    const tokens = query.trim().split(/[\s　]+/).filter(Boolean)
    if (tokens.length === 0) return contacts
    return contacts.filter((c) =>
      tokens.every((t) =>
        c.site_contact.includes(t) ||
        c.general_contractor.includes(t) ||
        c.site_name.includes(t)
      )
    )
  }, [query, contacts])

  function startEdit(c: Contact) {
    setEditingId(c.id)
    setEditSiteContact(c.site_contact)
    setEditPhoneNumber(c.phone_number ?? '')
  }

  async function handleSave(id: string) {
    setSaving(true)
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_contact: editSiteContact, phone_number: editPhoneNumber }),
    })
    setSaving(false)
    if (res.ok) {
      setEditingId(null)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '編集に失敗しました')
    }
  }

  async function handleDelete(c: Contact) {
    if (!confirm(`「${c.site_contact} 様（${c.general_contractor} / ${c.site_name}）」を削除しますか？`)) return
    setDeletingId(c.id)
    const res = await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例）大林　新笹子　中村"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">該当する連絡先が見つかりません</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 font-medium">
                <th className="px-4 py-3">担当者</th>
                <th className="px-4 py-3">ゼネコン</th>
                <th className="px-4 py-3">現場</th>
                <th className="px-4 py-3">電話番号</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => {
                const isEditing = editingId === c.id
                const isDeleting = deletingId === c.id
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    {isEditing ? (
                      <>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              value={editSiteContact}
                              onChange={(e) => setEditSiteContact(e.target.value)}
                              className={`${inputCls} w-28`}
                            />
                            <span className="text-sm text-gray-700 shrink-0">様</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{c.general_contractor}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{c.site_name}</td>
                        <td className="px-3 py-2">
                          <input
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            type="tel"
                            placeholder="ハイフンなし"
                            className={`${inputCls} w-36 font-mono`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSave(c.id)}
                              disabled={saving || !editSiteContact.trim()}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
                            >
                              {saving ? '保存中...' : '保存'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-800">{c.site_contact} 様</td>
                        <td className="px-4 py-3 text-gray-600">{c.general_contractor}</td>
                        <td className="px-4 py-3 text-gray-600">{c.site_name}</td>
                        <td className="px-4 py-3">
                          {c.phone_number ? (
                            <a href={`tel:${c.phone_number}`} className="text-blue-600 hover:text-blue-800 font-mono">
                              {formatPhone(c.phone_number)}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">未登録</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(c)}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              disabled={isDeleting}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-2 py-0.5 rounded border border-red-200"
                            >
                              {isDeleting ? '削除中...' : '削除'}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">{results.length} 件</p>
        </div>
      )}
    </div>
  )
}
