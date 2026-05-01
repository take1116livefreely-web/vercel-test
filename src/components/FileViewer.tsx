'use client'

import { useState, useEffect } from 'react'
import type { IncidentFile } from '@/lib/supabase/types'

type Props = {
  file: IncidentFile
  onClose: () => void
}

function isTextLike(mime: string, name: string): boolean {
  if (mime.startsWith('text/')) return true
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['log', 'ini', 'usi', 'csv', 'txt', 'conf', 'config', 'xml', 'json', 'yaml', 'yml'].includes(ext)
}

export default function FileViewer({ file, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/files/${file.id}`)
      const json = await res.json()
      const signedUrl: string = json.url

      if (file.mime_type.startsWith('image/')) {
        setUrl(signedUrl)
      } else if (isTextLike(file.mime_type, file.name)) {
        const content = await fetch(signedUrl).then((r) => r.text())
        setText(content)
      } else {
        setUrl(signedUrl)
      }
      setLoading(false)
    }
    load()
  }, [file])

  async function handleDownload() {
    const res = await fetch(`/api/files/${file.id}`)
    const json = await res.json()
    const a = document.createElement('a')
    a.href = json.url
    a.download = file.name
    a.click()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-800 truncate mr-4">{file.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
            >
              ダウンロード
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-10">読み込み中...</p>
          )}
          {!loading && file.mime_type.startsWith('image/') && url && (
            <img src={url} alt={file.name} className="max-w-full mx-auto rounded" />
          )}
          {!loading && text !== null && (
            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-3 overflow-auto">
              {text}
            </pre>
          )}
          {!loading && !file.mime_type.startsWith('image/') && text === null && (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-4">このファイルはブラウザで表示できません</p>
              <button
                onClick={handleDownload}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-4 py-2"
              >
                ダウンロードして確認
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
