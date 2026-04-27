import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '現場対応管理',
  description: '社内現場対応の管理・記録アプリケーション',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
