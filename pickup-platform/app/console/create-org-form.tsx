'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { checkSlugAvailability, createOrg } from './actions'
import { browserTimeZone } from '@/lib/datetime'
import { normalizeSlug } from '@/lib/tenancy/reserved-slugs'
import { DEFAULT_ORG_ACCENT } from '@/lib/org-branding'
import { validateLogoFile } from '@/lib/org-logo'
import { consoleInput, consoleLabel, btnPrimary } from './_components/console-ui'
import { ConsoleSubmitButton } from './_components/console-submit-button'
import { useConsoleToast } from './_components/console-toast'

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function CreateOrgForm() {
  const toast = useConsoleToast()
  const [pending, setPending] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [timezone, setTimezone] = useState('UTC')
  const [slugState, setSlugState] = useState<SlugState>('idle')
  const [accent, setAccent] = useState(DEFAULT_ORG_ACCENT)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoInputId = useId()

  useEffect(() => {
    setTimezone(browserTimeZone())
  }, [])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

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

  function onLogoChange(file: File | null) {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
    if (!file) {
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }
    const check = validateLogoFile(file)
    if (!check.ok) {
      toast.error(check.error)
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(formData: FormData) {
    const logo = formData.get('logo')
    if (logo instanceof File && logo.size > 0) {
      const check = validateLogoFile(logo)
      if (!check.ok) {
        toast.error(check.error)
        return
      }
    }

    setPending(true)
    const result = await createOrg(formData)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
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

      <div className="border-t border-white/10 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className={consoleLabel}>Branding</span>
          <span className="text-xs text-zinc-600">Optional — editable later</span>
        </div>

        <input
          ref={logoInputRef}
          id={logoInputId}
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
        />

        <div className="mt-3 flex items-center gap-3">
          <label
            htmlFor={logoInputId}
            className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-indigo-500/40 ${
              logoPreview ? '' : 'border border-dashed border-white/15 bg-white/3'
            }`}
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={logoPreview} alt="" className="h-16 w-16 object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-zinc-500" aria-hidden>
                <path
                  d="M12 16V8m0 0 3 3m-3-3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </label>

          <div className="min-w-0">
            <label
              htmlFor={logoInputId}
              className="cursor-pointer text-sm font-medium text-zinc-200 hover:text-white"
            >
              {logoPreview ? 'Change logo' : 'Upload logo'}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">PNG, JPG, or WebP · max 2 MB</p>
            {logoPreview ? (
              <button
                type="button"
                onClick={() => onLogoChange(null)}
                className="mt-1 text-xs text-zinc-400 transition-colors hover:text-red-300"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className={consoleLabel}>Accent color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Pick accent color"
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
            />
            <input
              name="accent_color"
              type="text"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              aria-label="Accent color hex"
              className="w-24 rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>
        </div>
      </div>

      {/* Language defaults to English for now; selector hidden until i18n ships. */}
      <input type="hidden" name="default_locale" value="en" />

      <ConsoleSubmitButton
        pending={pending}
        pendingLabel="Creating…"
        disabled={slugState === 'taken' || slugState === 'invalid' || slugState === 'checking'}
        className={`w-full ${btnPrimary}`}
      >
        Create group
      </ConsoleSubmitButton>
    </form>
  )
}
