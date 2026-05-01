'use client'

import { useState, useMemo } from 'react'
import { formatPhone } from '@/lib/phone'

type Contact = {
  site_contact: string
  phone_number: string
  general_contractor: string
  site_name: string
}

function getSurname(name: string): string {
  return name.split(/[\s　]/)[0]
}

function dedup(contacts: Contact[]): Contact[] {
  const seen = new Set<string>()
  return contacts.filter((c) => {
    const key = `${c.general_contractor}|${c.site_name}|${c.phone_number}|${getSurname(c.site_contact)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const unique = dedup(contacts)
    const tokens = query.trim().split(/[\s　]+/).filter(Boolean)
    if (tokens.length === 0) return unique
    return unique.filter((c) =>
      tokens.every((t) =>
        c.site_contact.includes(t) ||
        c.general_contractor.includes(t) ||
        c.site_name.includes(t)
      )
    )
  }, [query, contacts])

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
              </tr>
            </thead>
            <tbody>
              {results.map((c, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.site_contact} 様</td>
                  <td className="px-4 py-3 text-gray-600">{c.general_contractor}</td>
                  <td className="px-4 py-3 text-gray-600">{c.site_name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${c.phone_number}`}
                      className="text-blue-600 hover:text-blue-800 font-mono"
                    >
                      {formatPhone(c.phone_number)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">{results.length} 件</p>
        </div>
      )}
    </div>
  )
}
