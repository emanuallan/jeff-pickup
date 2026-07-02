'use client'

import { useRef, useState } from 'react'
import { removeOrgLogo, updateBranding, uploadOrgLogo } from '../actions'
import { btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { useConsoleToast } from '../_components/console-toast'
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

const LOGO_SIZE = 'h-20 w-20'

function logoPreviewUrl(url: string, cacheKey: number) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${cacheKey}`
}

function LogoRemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      aria-label="Remove logo"
      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-zinc-400 shadow-md transition hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export function BrandingForm({
  orgSlug,
  orgName,
  logoUrl: initialLogoUrl,
  accentColor,
  canManageLogo,
}: Props) {
  const toast = useConsoleToast()
  const [color, setColor] = useState(accentColor)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [logoCacheKey, setLogoCacheKey] = useState(0)
  const [pending, setPending] = useState(false)
  const [logoAction, setLogoAction] = useState<LogoAction>(null)
  const logoRequestRef = useRef(0)

  const inputId = `${orgSlug}-logo-upload`
  const logoPending = logoAction !== null
  const previewUrl = logoUrl ? logoPreviewUrl(logoUrl, logoCacheKey) : null

  async function handleSubmit(formData: FormData) {
    setPending(true)
    try {
      const result = await updateBranding(orgSlug, formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Saved.')
      }
    } catch {
      toast.error('Save failed. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleLogoSelect(file: File | undefined) {
    if (!file || logoPending) return

    const validation = validateLogoFile(file)
    if (!validation.ok) {
      toast.error(validation.error)
      return
    }

    const requestId = ++logoRequestRef.current
    setLogoAction('upload')

    const formData = new FormData()
    formData.set('logo', file)

    try {
      const result = await uploadOrgLogo(orgSlug, formData)
      if (requestId !== logoRequestRef.current) return

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('logoUrl' in result && result.logoUrl) {
        setLogoUrl(result.logoUrl)
        setLogoCacheKey((key) => key + 1)
      }
      toast.success('Logo uploaded.')
    } catch {
      if (requestId !== logoRequestRef.current) return
      toast.error('Upload failed. Try again.')
    } finally {
      if (requestId === logoRequestRef.current) {
        setLogoAction(null)
      }
    }
  }

  async function handleRemoveLogo() {
    if (!logoUrl || logoPending) return

    const requestId = ++logoRequestRef.current
    setLogoAction('remove')

    try {
      const result = await removeOrgLogo(orgSlug)
      if (requestId !== logoRequestRef.current) return

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      setLogoUrl(null)
      toast.success('Logo removed.')
    } catch {
      if (requestId !== logoRequestRef.current) return
      toast.error('Remove failed. Try again.')
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

        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={logoPending || pending || !canManageLogo}
          onChange={(e) => {
            const file = e.target.files?.[0]
            void handleLogoSelect(file)
            e.target.value = ''
          }}
        />

        <div className="mt-3 flex items-center gap-4">
          <div className="relative shrink-0" aria-busy={logoPending} aria-live="polite">
            {canManageLogo ? (
              <label
                htmlFor={inputId}
                className={`relative block ${LOGO_SIZE} cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/10 transition hover:ring-indigo-500/40 ${
                  logoPending ? 'pointer-events-none' : ''
                } ${previewUrl ? '' : 'border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- cache-busted preview URL from storage
                  <img src={previewUrl} alt="" className={`${LOGO_SIZE} object-cover`} />
                ) : (
                  <span
                    className={`flex ${LOGO_SIZE} flex-col items-center justify-center gap-1 text-zinc-500`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
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
                    <span className="text-[10px] font-medium uppercase tracking-wide">Add</span>
                  </span>
                )}

                {logoPending ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-xs font-medium text-zinc-200">
                    {logoAction === 'remove' ? 'Removing…' : 'Uploading…'}
                  </span>
                ) : null}
              </label>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className={`${LOGO_SIZE} rounded-2xl object-cover ring-1 ring-white/10`}
              />
            ) : (
              <div
                className={`flex ${LOGO_SIZE} items-center justify-center rounded-2xl text-2xl font-bold ring-1 ring-white/10`}
                style={{ backgroundColor: color, color: readableTextColor(color) }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}

            {canManageLogo && previewUrl && !logoPending ? (
              <LogoRemoveButton onClick={() => void handleRemoveLogo()} disabled={pending} />
            ) : null}
          </div>

          <div className="min-w-0 space-y-1">
            {canManageLogo ? (
              <>
                <label
                  htmlFor={inputId}
                  className={`block text-sm font-medium text-zinc-200 ${logoPending ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:text-white'}`}
                >
                  {previewUrl ? 'Change photo' : 'Upload photo'}
                </label>
                <p className="text-xs leading-relaxed text-zinc-500">
                  PNG, JPG, or WebP · max 2 MB
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-500">Only group owners and admins can change the logo.</p>
            )}
          </div>
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

        <ConsoleSubmitButton
          pending={pending}
          disabled={logoPending}
          className={`w-full sm:w-auto ${btnSecondary}`}
        >
          Save branding
        </ConsoleSubmitButton>
      </form>
    </div>
  )
}
