'use client'

import { useState } from 'react'
import { updateBranding } from '../actions'
import { consoleInput, btnSecondary } from '../_components/console-ui'

type Props = {
  orgSlug: string
  logoUrl: string | null
  accentColor: string
}

export function BrandingForm({ orgSlug, logoUrl, accentColor }: Props) {
  const [color, setColor] = useState(accentColor)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateBranding(orgSlug, formData)
    setMessage(result?.error ? result.error : 'Saved.')
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs text-zinc-500">Logo URL (optional)</span>
        <input
          name="logo_url"
          type="url"
          defaultValue={logoUrl ?? ''}
          placeholder="https://…/logo.png"
          className={`mt-1 ${consoleInput}`}
        />
        {/* TODO: Supabase Storage upload pipeline (post-MVP) */}
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Accent color</span>
        <div className="mt-1 flex items-center gap-3">
          <input
            name="accent_color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-zinc-950/60"
          />
          <span className="text-sm text-zinc-400">{color}</span>
        </div>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button type="submit" className={`w-full sm:w-auto ${btnSecondary}`}>
          Save branding
        </button>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
      </div>
    </form>
  )
}
