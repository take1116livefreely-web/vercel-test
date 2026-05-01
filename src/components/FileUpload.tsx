'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { IncidentFile } from '@/lib/supabase/types'

type Props = {
  incidentId?: string
  responseId?: string
  currentCount: number
  onUploaded: (file: IncidentFile) => void
}

const MAX_FILES = 5
const MAX_OTHER_BYTES = 5 * 1024 * 1024

export default function FileUpload({ incidentId, responseId, currentCount, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function compressImage(file: File): Promise<File> {
    const imageCompression = (await import('browser-image-compression')).default
    return imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
  }

  async function uploadFile(file: File) {
    setError('')
    setUploading(true)

    try {
      let toUpload = file

      if (file.type.startsWith('image/')) {
        toUpload = await compressImage(file)
      } else if (file.size > MAX_OTHER_BYTES) {
        setError(`${file.name} は5MBを超えています`)
        return
      }

      const parentId = incidentId ?? responseId
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${parentId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('incident-files')
        .upload(path, toUpload, { contentType: file.type || 'application/octet-stream' })

      if (storageErr) {
        setError('アップロードに失敗しました')
        return
      }

      const res = await fetch('/api/files/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incidentId ?? null,
          response_id: responseId ?? null,
          storage_path: path,
          name: file.name,
          mime_type: file.type || 'application/octet-stream',
          size: toUpload.size,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'エラーが発生しました')
        await supabase.storage.from('incident-files').remove([path])
        return
      }

      const json = await res.json()
      onUploaded(json.file)
    } catch {
      setError('アップロードに失敗しました')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const remaining = MAX_FILES - currentCount
    for (const file of files.slice(0, remaining)) {
      await uploadFile(file)
    }
    if (files.length > remaining) {
      setError(`ファイルは${MAX_FILES}件までです`)
    }
  }

  if (currentCount >= MAX_FILES) {
    return <p className="text-xs text-gray-400 mt-2">添付ファイル上限（{MAX_FILES}件）に達しています</p>
  }

  return (
    <div className="mt-2">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 disabled:opacity-50"
      >
        {uploading ? 'アップロード中...' : '＋ ファイルを添付'}
      </button>
      <span className="text-xs text-gray-400 ml-2">{currentCount}/{MAX_FILES}</span>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
