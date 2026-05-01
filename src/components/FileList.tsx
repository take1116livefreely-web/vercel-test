'use client'

import { useState } from 'react'
import FileViewer from './FileViewer'
import type { IncidentFile } from '@/lib/supabase/types'

type Props = {
  files: IncidentFile[]
  currentUserId: string
  isAdmin: boolean
  onDeleted: (id: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function FileList({ files, currentUserId, isAdmin, onDeleted }: Props) {
  const [viewing, setViewing] = useState<IncidentFile | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDownload(file: IncidentFile) {
    const res = await fetch(`/api/files/${file.id}`)
    const json = await res.json()
    const a = document.createElement('a')
    a.href = json.url
    a.download = file.name
    a.click()
  }

  async function handleDelete(id: string) {
    if (!confirm('このファイルを削除しますか？')) return
    setDeleting(id)
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      onDeleted(id)
    } else {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  if (files.length === 0) return null

  return (
    <>
      <div className="mt-2 space-y-1">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
            <span>{f.mime_type.startsWith('image/') ? '🖼️' : '📄'}</span>
            <span className="flex-1 truncate text-gray-700">{f.name}</span>
            <span className="text-gray-400 shrink-0">{formatSize(f.size)}</span>
            <button
              onClick={() => setViewing(f)}
              className="text-blue-600 hover:text-blue-800 shrink-0"
            >
              閲覧
            </button>
            <button
              onClick={() => handleDownload(f)}
              className="text-gray-500 hover:text-gray-700 shrink-0"
            >
              DL
            </button>
            {(f.uploaded_by === currentUserId || isAdmin) && (
              <button
                onClick={() => handleDelete(f.id)}
                disabled={deleting === f.id}
                className="text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>
      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
