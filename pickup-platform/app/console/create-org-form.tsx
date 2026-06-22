'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugAvailability, createOrg } from './actions'
import { normalizeSlug } from '@/lib/tenancy/reserved-slugs'
import { consoleInput, consoleLabel, btnPrimary } from './_components/console-ui'

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function CreateOrgForm() {
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
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
    <form
      action={handleSubmit}
      className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:p-5"
    >
      <input type="hidden" name="timezone" value={timezone} />

      <label className="block">
        <span className={consoleLabel}>Group name</span>
        <input
          name="name"
          required
          className={`mt-1 ${consoleInput}`}
          placeholder="Jeff Soccer"
          onChange={(e) => {
            // Mirror the name into the slug until the user edits the slug directly.
            if (!slugEdited) {
              onSlugChange(e.target.value)
            }
          }}
        />
      </label>

      <label className="block">
        <span className={consoleLabel}>Description</span>
        <input
          name="description"
          className={`mt-1 ${consoleInput}`}
          placeholder="Weekly pickup soccer, Saturday morning run club…"
        />
      </label>

      <label className="block">
        <span className={consoleLabel}>URL slug</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugEdited(true)
            onSlugChange(e.target.value)
          }}
          className={`mt-1 ${consoleInput}`}
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

      {/* Language defaults to English for now; selector hidden until i18n ships. */}
      <input type="hidden" name="default_locale" value="en" />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={slugState === 'taken' || slugState === 'invalid' || slugState === 'checking'}
        className={`w-full ${btnPrimary}`}
      >
        Create group
      </button>
    </form>
  )
}
