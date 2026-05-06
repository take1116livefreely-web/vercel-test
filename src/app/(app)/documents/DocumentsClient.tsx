'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CategoryWithSystems } from '@/lib/supabase/types'

const MAX_PDF_BYTES = 20 * 1024 * 1024

type DocRow = {
  id: string
  name: string
  size: number
  system_id: string | null
  systemName: string
  categoryName: string
  uploaded_by: string | null
  uploaderName: string
  ai_training: boolean
  created_at: string
}

type Props = {
  documents: DocRow[]
  categories: CategoryWithSystems[]
  userRole: string
  userId: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function DocumentsClient({ documents: initialDocs, categories, userRole, userId }: Props) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)
  const [query, setQuery] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [systemId, setSystemId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const isAdminOrDeveloper = userRole === 'admin' || userRole === 'developer'
  const isDeveloper = userRole === 'developer'

  const results = useMemo(() => {
    const tokens = query.trim().split(/[\s　]+/).filter(Boolean)
    if (tokens.length === 0) return docs
    return docs.filter((d) =>
      tokens.every((t) =>
        d.name.includes(t) ||
        d.categoryName.includes(t) ||
        d.systemName.includes(t)
      )
    )
  }, [query, docs])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setUploadError('')
    if (!f) { setFile(null); return }
    if (f.type !== 'application/pdf') {
      setUploadError('PDFファイルのみアップロードできます')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (f.size > MAX_PDF_BYTES) {
      setUploadError('ファイルサイズは20MB以内にしてください')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadError('')

    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.pdf`
    const { error: storageErr } = await supabase.storage
      .from('shared-documents')
      .upload(path, file, { contentType: 'application/pdf' })

    if (storageErr) {
      setUploadError('アップロードに失敗しました: ' + storageErr.message)
      setUploading(false)
      return
    }

    const res = await fetch('/api/shared-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, storage_path: path, size: file.size, system_id: systemId || null }),
    })
    const json = await res.json()
    if (!res.ok) {
      setUploadError(json.error ?? 'メタデータ保存に失敗しました')
    } else {
      setFile(null)
      setSystemId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    }
    setUploading(false)
  }

  async function getSignedUrl(id: string): Promise<string | null> {
    const res = await fetch(`/api/shared-documents/${id}/url`)
    const json = await res.json()
    return json.url ?? null
  }

  async function handleOpen(id: string) {
    // iOS Safari はawait後のwindow.openをブロックするため先に空ウィンドウを開く
    const newWindow = window.open('', '_blank')
    setLoadingId(id)
    const url = await getSignedUrl(id)
    setLoadingId(null)
    if (!url) {
      newWindow?.close()
      alert('URLの取得に失敗しました')
      return
    }
    if (newWindow) {
      newWindow.location.href = url
    } else {
      window.location.href = url
    }
  }

  async function handleDownload(doc: DocRow) {
    setLoadingId(doc.id)
    const url = await getSignedUrl(doc.id)
    setLoadingId(null)
    if (!url) { alert('URLの取得に失敗しました'); return }

    try {
      const blob = await fetch(url).then((r) => r.blob())
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      alert('ダウンロードに失敗しました')
    }
  }

  async function handleDelete(doc: DocRow) {
    if (!confirm(`「${doc.name}」を削除しますか？`)) return
    setDeletingId(doc.id)
    const res = await fetch(`/api/shared-documents/${doc.id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } else {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
    }
  }

  async function handleAiTraining(doc: DocRow, value: boolean) {
    setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, ai_training: value } : d))
    const res = await fetch(`/api/shared-documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_training: value }),
    })
    if (!res.ok) {
      setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, ai_training: doc.ai_training } : d))
      alert('更新に失敗しました')
    }
  }

  const allSystems = categories.flatMap((c) =>
    c.systems.map((s) => ({ id: s.id, label: `${c.name} / ${s.name}` }))
  )

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">PDFをアップロード</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              {file ? file.name : 'ファイルを選択...'}
            </button>
            {file && <span className="text-xs text-gray-400 ml-2">{formatSize(file.size)}</span>}
          </div>
          <div>
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">システム名（任意）</option>
              {allSystems.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
      </div>

      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例）マニュアル　大成　CCTV"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Document list */}
      {results.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">
          {docs.length === 0 ? 'まだ書類がアップロードされていません' : '該当する書類が見つかりません'}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 font-medium">
                <th className="px-4 py-3">ファイル名</th>
                <th className="px-4 py-3">ジャンル / システム</th>
                <th className="px-4 py-3">投稿者</th>
                <th className="px-4 py-3">サイズ</th>
                <th className="px-4 py-3">日付</th>
                {isDeveloper && <th className="px-4 py-3 text-center">AI診断候補</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((doc) => {
                const isLoading = loadingId === doc.id
                const isDeleting = deletingId === doc.id
                return (
                  <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{doc.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {doc.systemName
                        ? <>{doc.categoryName && <span className="text-gray-400">{doc.categoryName} / </span>}{doc.systemName}</>
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{doc.uploaderName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{formatSize(doc.size)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(doc.created_at)}</td>
                    {isDeveloper && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={doc.ai_training}
                          onChange={(e) => handleAiTraining(doc, e.target.checked)}
                          className="w-4 h-4 accent-blue-600"
                          title="将来のAI診断学習データ候補として指定（現在は診断に使用していません）"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpen(doc.id)}
                          disabled={isLoading}
                          className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          {isLoading ? '...' : '開く'}
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={isLoading}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 px-2 py-0.5 rounded border border-gray-200"
                        >
                          {isLoading ? '...' : 'DL'}
                        </button>
                        {isAdminOrDeveloper && (
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={isDeleting}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-2 py-0.5 rounded border border-red-200"
                          >
                            {isDeleting ? '...' : '削除'}
                          </button>
                        )}
                      </div>
                    </td>
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
