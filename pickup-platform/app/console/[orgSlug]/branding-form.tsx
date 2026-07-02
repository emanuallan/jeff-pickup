'use client'

import { useRef, useState } from 'react'
import { removeOrgLogo, updateBranding, uploadOrgLogo } from '../actions'
import { btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { readableTextColor } from '@/lib/colors'
import { validateLogoFile } from '@/lib/org-logo'

type Props = {
  orgSlug: string
  orgName: string
  logoUrl: string | null
  accentColor: string
  canManageLogo: boolean
}

type LogoAction = 'upload' | 'remove' | null

function logoPreviewUrl(url: string, cacheKey: number) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${cacheKey}`
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
  const [logoCacheKey, setLogoCacheKey] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [logoAction, setLogoAction] = useState<LogoAction>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoRequestRef = useRef(0)

  const logoPending = logoAction !== null
  const previewUrl = logoUrl ? logoPreviewUrl(logoUrl, logoCacheKey) : null

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setError(null)
    setPending(true)
    try {
      const result = await updateBranding(orgSlug, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setMessage('Saved.')
      }
    } catch {
      setError('Save failed. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleLogoSelect(file: File | undefined) {
    if (!file || logoPending) return

    const validation = validateLogoFile(file)
    if (!validation.ok) {
      setLogoSuccess(null)
      setLogoError(validation.error)
      return
    }

    const requestId = ++logoRequestRef.current
    setLogoSuccess(null)
    setLogoError(null)
    setLogoAction('upload')

    const formData = new FormData()
    formData.set('logo', file)

    try {
      const result = await uploadOrgLogo(orgSlug, formData)
      if (requestId !== logoRequestRef.current) return

      if ('error' in result && result.error) {
        setLogoError(result.error)
        return
      }

      if ('logoUrl' in result && result.logoUrl) {
        setLogoUrl(result.logoUrl)
        setLogoCacheKey((key) => key + 1)
      }
      setLogoSuccess('Logo uploaded.')
    } catch {
      if (requestId !== logoRequestRef.current) return
      setLogoError('Upload failed. Try again.')
    } finally {
      if (requestId === logoRequestRef.current) {
        setLogoAction(null)
      }
    }
  }

  async function handleRemoveLogo() {
    if (!logoUrl || logoPending) return

    const requestId = ++logoRequestRef.current
    setLogoSuccess(null)
    setLogoError(null)
    setLogoAction('remove')

    try {
      const result = await removeOrgLogo(orgSlug)
      if (requestId !== logoRequestRef.current) return

      if ('error' in result && result.error) {
        setLogoError(result.error)
        return
      }

      setLogoUrl(null)
      setLogoSuccess('Logo removed.')
    } catch {
      if (requestId !== logoRequestRef.current) return
      setLogoError('Remove failed. Try again.')
    } finally {
      if (requestId === logoRequestRef.current) {
        setLogoAction(null)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-xs text-zinc-500">Group logo (optional)</span>
        <div className="mt-2 flex items-start gap-4">
          <div
            className={`relative shrink-0 ${logoPending ? 'opacity-60' : ''}`}
            aria-busy={logoPending}
            aria-live="polite"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- cache-busted preview URL from storage
              <img
                src={previewUrl}
                alt=""
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ring-1 ring-white/10"
                style={{ backgroundColor: color, color: readableTextColor(color) }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {canManageLogo ? (
            <div className="min-w-0 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={logoPending || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  void handleLogoSelect(file)
                  e.target.value = ''
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={logoPending || pending}
                  onClick={() => fileInputRef.current?.click()}
                  className={btnSecondary}
                  aria-busy={logoAction === 'upload'}
                >
                  {logoAction === 'upload'
                    ? 'Uploading…'
                    : logoUrl
                      ? 'Replace logo'
                      : 'Upload logo'}
                </button>
                {logoUrl ? (
                  <button
                    type="button"
                    disabled={logoPending || pending}
                    onClick={() => void handleRemoveLogo()}
                    className="text-sm text-zinc-400 underline-offset-2 transition hover:text-zinc-200 hover:underline disabled:opacity-50"
                    aria-busy={logoAction === 'remove'}
                  >
                    {logoAction === 'remove' ? 'Removing…' : 'Remove'}
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">PNG, JPG, or WebP · max 2 MB</p>
              {logoSuccess ? <p className="text-xs text-emerald-400">{logoSuccess}</p> : null}
              {logoError ? <p className="text-xs text-red-300">{logoError}</p> : null}
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
              disabled={logoPending}
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-zinc-950/60 disabled:opacity-50"
            />
            <span className="text-sm text-zinc-400">{color}</span>
          </div>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <ConsoleSubmitButton
            pending={pending}
            disabled={logoPending}
            className={`w-full sm:w-auto ${btnSecondary}`}
          >
            Save branding
          </ConsoleSubmitButton>
          {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
          {error ? <span className="text-xs text-red-300">{error}</span> : null}
        </div>
      </form>
    </div>
  )
}
