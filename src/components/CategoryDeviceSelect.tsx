'use client'

import { useState } from 'react'
import type { CategoryWithSystems } from '@/lib/categories'

const OTHER = '__other__'

type Props = {
  categories: CategoryWithSystems[]
  category: string
  device: string
  onCategoryChange: (v: string) => void
  onDeviceChange: (v: string) => void
  required?: boolean
  className?: string
  labelClassName?: string
}

export default function CategoryDeviceSelect({
  categories,
  category,
  device,
  onCategoryChange,
  onDeviceChange,
  required,
  className = '',
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
}: Props) {
  const devices = categories.find((c) => c.name === category)?.systems.map((s) => s.name) ?? []

  const [useOther, setUseOther] = useState(() =>
    !!device && devices.length > 0 && !devices.includes(device)
  )

  const selectValue = useOther ? OTHER : device

  function handleCategoryChange(v: string) {
    onCategoryChange(v)
    onDeviceChange('')
    setUseOther(false)
  }

  function handleDeviceSelectChange(v: string) {
    if (v === OTHER) {
      setUseOther(true)
      onDeviceChange('')
    } else {
      setUseOther(false)
      onDeviceChange(v)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClassName}>
          ジャンル {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required={required}
          className={className}
        >
          <option value="">選択してください</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {category && (
        <div>
          <label className={labelClassName}>
            システム名 {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectValue}
            onChange={(e) => handleDeviceSelectChange(e.target.value)}
            required={required && !useOther}
            className={className}
          >
            <option value="">選択してください</option>
            {devices.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value={OTHER}>その他（自由入力）</option>
          </select>
          {useOther && (
            <input
              type="text"
              value={device}
              onChange={(e) => onDeviceChange(e.target.value)}
              placeholder="システム名を入力"
              required={required}
              className={`mt-2 ${className}`}
            />
          )}
        </div>
      )}
    </div>
  )
}
