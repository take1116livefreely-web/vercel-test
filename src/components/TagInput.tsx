'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  name?: string
}

export default function TagInput({ value, onChange, placeholder, className, name }: Props) {
  const [allTags, setAllTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/tags').then((r) => r.json()).then((d) => setAllTags(d.tags ?? []))
  }, [])

  function getLastToken(val: string): string {
    return val.split(/[\s　]/).pop() ?? ''
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)

    const token = getLastToken(val).replace(/^#/, '')
    if (token.length >= 1) {
      const search = token.toLowerCase()
      const used = val.split(/[\s　]/).filter(Boolean).map((t) => t.replace(/^#/, '').toLowerCase())
      const matches = allTags
        .filter((t) => t.toLowerCase().startsWith(search) && !used.includes(t.toLowerCase()))
        .slice(0, 8)
      setSuggestions(matches)
      setShowDropdown(matches.length > 0)
    } else {
      setShowDropdown(false)
    }
  }

  function applySuggestion(tag: string) {
    const tokens = value.split(/[\s　]/)
    tokens[tokens.length - 1] = tag
    onChange(tokens.join(' ') + ' ')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={() => applySuggestion(tag)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
