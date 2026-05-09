'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ACTION_TYPES = ['確認作業', '再起動・リセット', '部品交換', '設定変更', '業者手配', 'その他'] as const
const RESULT_TYPES = ['効果なし', '部分改善', '解決'] as const
const CONFIRMATION_RESULT_TYPES = ['異常なし', '異常あり'] as const

type Props = { incidentId: string; userId: string; incidentType: 'trouble' | 'other' }

const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const MAX_FILES = 5
const MAX_OTHER_BYTES = 5 * 1024 * 1024

export default function ResponseForm({ incidentId, userId, incidentType }: Props) {
  const [content, setContent] = useState('')
  const [actionType, setActionType] = useState<string>('その他')
  const [resultType, setResultType] = useState<string>('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setPendingFiles((prev) => [...prev, ...files].slice(0, MAX_FILES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadFile(file: File, responseId: string) {
    let toUpload = file
    if (file.type.startsWith('image/')) {
      const imageCompression = (await import('browser-image-compression')).default
      toUpload = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
    } else if (file.size > MAX_OTHER_BYTES) {
      return
    }
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${responseId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error: storageErr } = await supabase.storage
      .from('incident-files')
      .upload(path, toUpload, { contentType: file.type || 'application/octet-stream' })
    if (storageErr) return
    await fetch('/api/files/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: null,
        response_id: responseId,
        storage_path: path,
        name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: toUpload.size,
      }),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from('responses')
      .insert({
        incident_id: incidentId,
        content: content.trim(),
        responder_id: userId,
        action_type: actionType,
        result_type: resultType,
      })
      .select('id')
      .single()

    if (err || !data) {
      setError('送信に失敗しました。')
    } else {
      if (pendingFiles.length > 0) {
        await Promise.all(pendingFiles.map((f) => uploadFile(f, data.id)))
      }
      setContent('')
      setActionType('その他')
      setResultType('')
      setPendingFiles([])
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-2">対応を追加</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="対応内容を入力..."
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
      />
      {incidentType === 'trouble' && (
        <div className="flex flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">対応種別</label>
            <select
              value={actionType}
              onChange={(e) => {
                const v = e.target.value
                setActionType(v)
                setResultType(v === '確認作業' ? '異常なし' : '')
              }}
              className={selectCls}
            >
              {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">
              結果 {actionType !== '確認作業' && <span className="text-red-500">*</span>}
            </label>
            <select
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
              className={selectCls}
            >
              {actionType !== '確認作業' && <option value="" disabled>結果を選択 *</option>}
              {(actionType === '確認作業' ? CONFIRMATION_RESULT_TYPES : RESULT_TYPES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 whitespace-nowrap">（AI学習精度に影響します）</span>
          </div>
        </div>
      )}
      <div className="mb-2">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        {pendingFiles.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
          >
            ＋ ファイルを添付
          </button>
        )}
        <span className="text-xs text-gray-400 ml-2">{pendingFiles.length}/{MAX_FILES}</span>
        {pendingFiles.length > 0 && (
          <ul className="mt-1 space-y-1">
            {pendingFiles.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="truncate max-w-xs">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim() || (incidentType === 'trouble' && !resultType)}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
        >
          {loading ? '送信中...' : '対応を追加'}
        </button>
      </div>
    </form>
  )
}
