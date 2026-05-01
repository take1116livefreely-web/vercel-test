'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryWithSystems } from '@/lib/categories'

type Props = { categories: CategoryWithSystems[] }

export default function CategoriesClient({ categories }: Props) {
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [newSystemName, setNewSystemName] = useState<Record<string, string>>({})
  const [addingSystem, setAddingSystem] = useState<string | null>(null)
  const router = useRouter()

  async function handleAddCategory() {
    const name = newCatName.trim()
    if (!name) return
    setAddingCat(true)
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setAddingCat(false)
    if (res.ok) {
      setNewCatName('')
      router.refresh()
    } else {
      const j = await res.json()
      alert(j.error ?? 'エラーが発生しました')
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？\n配下のシステム名もすべて削除されます。`)) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const j = await res.json()
      alert(j.error ?? 'エラーが発生しました')
    }
  }

  async function handleAddSystem(categoryId: string) {
    const name = (newSystemName[categoryId] ?? '').trim()
    if (!name) return
    setAddingSystem(categoryId)
    const res = await fetch('/api/admin/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId, name }),
    })
    setAddingSystem(null)
    if (res.ok) {
      setNewSystemName((prev) => ({ ...prev, [categoryId]: '' }))
      router.refresh()
    } else {
      const j = await res.json()
      alert(j.error ?? 'エラーが発生しました')
    }
  }

  async function handleDeleteSystem(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/admin/systems/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const j = await res.json()
      alert(j.error ?? 'エラーが発生しました')
    }
  }

  return (
    <div className="space-y-6">
      {/* ジャンル追加 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">ジャンルを追加</p>
        <div className="flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="ジャンル名"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddCategory}
            disabled={addingCat || !newCatName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {addingCat ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      {/* ジャンル一覧 */}
      {categories.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">ジャンルが登録されていません</p>
      )}
      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">{cat.name}</h2>
            <button
              onClick={() => handleDeleteCategory(cat.id, cat.name)}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:border-red-400"
            >
              削除
            </button>
          </div>

          <div className="space-y-1 mb-3 min-h-[2rem]">
            {cat.systems.length === 0 && (
              <p className="text-xs text-gray-400">システム名が登録されていません</p>
            )}
            {cat.systems.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-gray-50">
                <span className="text-sm text-gray-700">{s.name}</span>
                <button
                  onClick={() => handleDeleteSystem(s.id, s.name)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <input
              value={newSystemName[cat.id] ?? ''}
              onChange={(e) => setNewSystemName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSystem(cat.id)}
              placeholder="システム名を入力"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleAddSystem(cat.id)}
              disabled={addingSystem === cat.id || !(newSystemName[cat.id] ?? '').trim()}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400"
            >
              {addingSystem === cat.id ? '追加中...' : '追加'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
