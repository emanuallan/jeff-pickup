'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugAvailability, createOrg } from './actions'
import { normalizeSlug } from '@/lib/tenancy/reserved-slugs'

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function CreateOrgForm() {
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [slugState, setSlugState] = useState<SlugState>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  function onSlugChange(next: string) {
    const normalized = normalizeSlug(next)
    setSlug(normalized)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!normalized) {
      setSlugState('idle')
      return
    }
    setSlugState('checking')
    debounceRef.current = setTimeout(async () => {
      const result = await checkSlugAvailability(normalized)
      if (result.available) {
        setSlugState('available')
      } else {
        setSlugState(result.reason === 'invalid' ? 'invalid' : 'taken')
      }
    }, 400)
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await createOrg(formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <input type="hidden" name="timezone" value={timezone} />

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">Group name</span>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Jeff Soccer"
          onChange={(e) => {
            if (!slug) {
              onSlugChange(e.target.value)
            }
          }}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">Activity</span>
        <input
          name="activity"
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Pickup soccer, run club, board games…"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">URL slug</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="jeffsoccer"
        />
        {slugState === 'checking' ? (
          <p className="mt-1 text-xs text-zinc-500">Checking availability…</p>
        ) : slugState === 'available' ? (
          <p className="mt-1 text-xs text-emerald-400">✓ {slug}.organizr.co is available</p>
        ) : slugState === 'taken' ? (
          <p className="mt-1 text-xs text-red-300">That slug is already taken.</p>
        ) : slugState === 'invalid' ? (
          <p className="mt-1 text-xs text-red-300">
            3–32 chars, lowercase letters, numbers, and hyphens only.
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">Lowercase letters, numbers, hyphens only.</p>
        )}
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">Default language</span>
        <select
          name="default_locale"
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue="en"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </select>
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={slugState === 'taken' || slugState === 'invalid' || slugState === 'checking'}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        Create group
      </button>
    </form>
  )
}
