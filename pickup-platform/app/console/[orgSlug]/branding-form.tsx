'use client'

import { useRef, useState } from 'react'
import { removeOrgLogo, updateBranding, uploadOrgLogo } from '../actions'
import { btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { readableTextColor } from '@/lib/colors'

type Props = {
  orgSlug: string
  orgName: string
  logoUrl: string | null
  accentColor: string
  canManageLogo: boolean
}

export function BrandingForm({
  orgSlug,
  orgName,
  logoUrl: initialLogoUrl,
  accentColor,
  canManageLogo,
}: Props) {
  const [color, setColor] = useState(accentColor)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [message, setMessage] = useState<string | null>(null)
  const [logoMessage, setLogoMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [logoPending, setLogoPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setPending(true)
    const result = await updateBranding(orgSlug, formData)
    setPending(false)
    setMessage(result?.error ? result.error : 'Saved.')
  }

  async function handleLogoSelect(file: File | undefined) {
    if (!file) return

    setLogoMessage(null)
    setLogoPending(true)

    const formData = new FormData()
    formData.set('logo', file)
    const result = await uploadOrgLogo(orgSlug, formData)

    setLogoPending(false)

    if ('error' in result && result.error) {
      setLogoMessage(result.error)
      return
    }

    if ('logoUrl' in result) {
      setLogoUrl(result.logoUrl)
    }
    setLogoMessage('Logo uploaded.')
  }

  async function handleRemoveLogo() {
    setLogoMessage(null)
    setLogoPending(true)

    const result = await removeOrgLogo(orgSlug)

    setLogoPending(false)

    if ('error' in result && result.error) {
      setLogoMessage(result.error)
      return
    }

    setLogoUrl(null)
    setLogoMessage('Logo removed.')
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-xs text-zinc-500">Group logo (optional)</span>
        <div className="mt-2 flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl font-bold ring-1 ring-white/10"
              style={{ backgroundColor: color, color: readableTextColor(color) }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}

          {canManageLogo ? (
            <div className="min-w-0 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={logoPending}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  void handleLogoSelect(file)
                  e.target.value = ''
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={logoPending}
                  onClick={() => fileInputRef.current?.click()}
                  className={btnSecondary}
                >
                  {logoPending ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </button>
                {logoUrl ? (
                  <button
                    type="button"
                    disabled={logoPending}
                    onClick={() => void handleRemoveLogo()}
                    className="text-sm text-zinc-400 underline-offset-2 transition hover:text-zinc-200 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">PNG, JPG, or WebP · max 2 MB</p>
              {logoMessage ? <p className="text-xs text-zinc-400">{logoMessage}</p> : null}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Only group owners and admins can change the logo.</p>
          )}
        </div>
      </div>

      <form action={handleSubmit} className="space-y-3">
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
          <ConsoleSubmitButton pending={pending} className={`w-full sm:w-auto ${btnSecondary}`}>
            Save branding
          </ConsoleSubmitButton>
          {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        </div>
      </form>
    </div>
  )
}
