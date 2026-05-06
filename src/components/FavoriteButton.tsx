'use client'

import { useState } from 'react'

type Props = {
  incidentId: string
  isFavorited: boolean
}

export default function FavoriteButton({ incidentId, isFavorited: initial }: Props) {
  const [favorited, setFavorited] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    const prev = favorited
    setFavorited(!prev)
    try {
      const res = await fetch(`/api/incidents/${incidentId}/favorite`, { method: 'POST' })
      if (!res.ok) setFavorited(prev)
    } catch {
      setFavorited(prev)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xl leading-none disabled:opacity-50 transition-colors ${
        favorited ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-300'
      }`}
      title={favorited ? 'お気に入りを解除' : 'お気に入りに追加'}
    >
      {favorited ? '★' : '☆'}
    </button>
  )
}
