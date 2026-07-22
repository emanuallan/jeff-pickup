'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  formatTierPrice,
  sortSponsorshipTiersForPublicDisplay,
  sponsorshipRefundPolicyText,
  type PublicSponsorshipTier,
} from '@/lib/sponsorship'
import { MAX_ORG_LOGO_BYTES, ORG_LOGO_MIME_TYPES } from '@/lib/org-logo'
import { accentOnDark, hexToRgba, readableTextColor } from '@/lib/colors'

type Step = 'tier' | 'details' | 'confirm'

type Props = {
  slug: string
  orgName: string
  accent: string
  tiers: PublicSponsorshipTier[]
  platformFeePercent: number
}

const STEPS: Step[] = ['tier', 'details', 'confirm']

function stepLabel(step: Step): string {
  if (step === 'tier') return 'Choose a tier'
  if (step === 'details') return 'Your company'
  return 'Confirm'
}

function StepDots({
  current,
  accent,
}: {
  current: Step
  accent: string
}) {
  const index = STEPS.indexOf(current)

  return (
    <div className="flex items-center gap-2" aria-hidden>
      {STEPS.map((step, i) => {
        const active = i === index
        const done = i < index
        return (
          <span
            key={step}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: active ? 28 : 8,
              backgroundColor: active || done ? accent : 'rgba(63,63,70,0.9)',
              opacity: done && !active ? 0.55 : 1,
            }}
          />
        )
      })}
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label className="text-sm font-medium text-zinc-200" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

const inputClass =
  'mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600'

export function SponsorshipSignupForm({
  slug,
  orgName,
  accent,
  tiers,
  platformFeePercent,
}: Props) {
  const [step, setStep] = useState<Step>('tier')
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 ? (tiers[0]?.id ?? null) : null,
  )
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorUrl, setSponsorUrl] = useState('')
  const [sponsorMessage, setSponsorMessage] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const accentFg = readableTextColor(accent)
  const accentSoft = accentOnDark(accent)
  const displayTiers = useMemo(() => sortSponsorshipTiersForPublicDisplay(tiers), [tiers])

  const selectedTier = useMemo(
    () => displayTiers.find((tier) => tier.id === selectedTierId) ?? null,
    [displayTiers, selectedTierId],
  )

  const stepIndex = STEPS.indexOf(step) + 1

  function handleLogoChange(file: File | null) {
    setLogoFile(file)
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  function goNextFromTier() {
    setError(null)
    if (!selectedTier) {
      setError('Choose a sponsorship tier to continue.')
      return
    }
    setStep('details')
  }

  function goNextFromDetails() {
    setError(null)
    if (!sponsorName.trim()) {
      setError('Company name is required.')
      return
    }
    if (!logoFile) {
      setError('Upload a logo so it can appear on the group pages.')
      return
    }
    if (logoFile.size > MAX_ORG_LOGO_BYTES) {
      setError('Logo must be 2 MB or smaller.')
      return
    }
    if (!ORG_LOGO_MIME_TYPES.includes(logoFile.type as (typeof ORG_LOGO_MIME_TYPES)[number])) {
      setError('Logo must be a PNG, JPG, or WebP image.')
      return
    }
    setStep('confirm')
  }

  async function handleContinue() {
    setError(null)

    if (!selectedTier) {
      setError('Choose a sponsorship tier.')
      setStep('tier')
      return
    }
    if (!sponsorName.trim() || !logoFile) {
      setError('Company name and logo are required.')
      setStep('details')
      return
    }

    setPending(true)
    try {
      const logoForm = new FormData()
      logoForm.set('slug', slug)
      logoForm.set('logo', logoFile)

      const logoResponse = await fetch('/api/sponsorship/logo', {
        method: 'POST',
        body: logoForm,
      })
      const logoData = (await logoResponse.json()) as { error?: string; logo_url?: string }
      if (!logoResponse.ok || !logoData.logo_url) {
        setError(logoData.error ?? 'Could not upload logo.')
        return
      }

      const checkoutResponse = await fetch('/api/sponsorship/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          tierId: selectedTier.id,
          sponsorName: sponsorName.trim(),
          logoUrl: logoData.logo_url,
          sponsorUrl: sponsorUrl.trim(),
          sponsorMessage: sponsorMessage.trim(),
        }),
      })
      const checkoutData = (await checkoutResponse.json()) as { error?: string; url?: string }
      if (!checkoutResponse.ok || !checkoutData.url) {
        setError(checkoutData.error ?? 'Could not start checkout.')
        return
      }

      window.location.href = checkoutData.url
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-3xl border border-zinc-800"
      style={{
        background: `linear-gradient(165deg, ${hexToRgba(accent, 0.12)} 0%, rgba(24,24,27,0.96) 42%, rgb(9,9,11) 100%)`,
        boxShadow: `inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
      }}
    >
      <div
        aria-hidden
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.7)} 50%, transparent 100%)`,
        }}
      />

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: hexToRgba(accentSoft, 0.95) }}
            >
              Step {stepIndex} of {STEPS.length}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-50">
              {stepLabel(step)}
            </h2>
          </div>
          <StepDots current={step} accent={accent} />
        </div>

        <div className="mt-6">
          {step === 'tier' ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-zinc-400">
                Pick the monthly tier that fits. Your logo is shown on {orgName}&apos;s public pages
                after they approve your request.
              </p>
              <div className="grid gap-3">
                {displayTiers.map((tier) => {
                  const selected = selectedTierId === tier.id
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setSelectedTierId(tier.id)
                        setError(null)
                        setStep('details')
                      }}
                      className="rounded-2xl border px-4 py-4 text-left transition"
                      style={
                        selected
                          ? {
                              borderColor: hexToRgba(accent, 0.55),
                              backgroundColor: hexToRgba(accent, 0.12),
                              boxShadow: `inset 0 0 0 1px ${hexToRgba(accent, 0.25)}`,
                            }
                          : {
                              borderColor: 'rgba(39,39,42,0.95)',
                              backgroundColor: 'rgba(9,9,11,0.45)',
                            }
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-50">{tier.name}</p>
                          {tier.description ? (
                            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                              {tier.description}
                            </p>
                          ) : null}
                        </div>
                        <p
                          className="shrink-0 text-sm font-semibold tabular-nums"
                          style={{ color: selected ? accentSoft : '#a1a1aa' }}
                        >
                          {formatTierPrice(tier.price_cents, tier.currency)}
                          <span className="font-normal text-zinc-500">/mo</span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step === 'details' ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-zinc-400">
                Tell {orgName} who you are. Your logo should look clear on a dark background.
              </p>

              <div>
                <FieldLabel htmlFor="sponsor-name">Company name</FieldLabel>
                <input
                  id="sponsor-name"
                  value={sponsorName}
                  onChange={(event) => setSponsorName(event.target.value)}
                  className={inputClass}
                  placeholder={`Support ${orgName}`}
                  autoComplete="organization"
                />
              </div>

              <div>
                <FieldLabel htmlFor="sponsor-logo">Company logo</FieldLabel>
                <label
                  htmlFor="sponsor-logo"
                  className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 px-4 py-6 text-center transition hover:border-zinc-500 hover:bg-zinc-950/80"
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={220}
                      height={56}
                      className="h-12 w-auto max-w-[220px] object-contain"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold"
                      style={{ backgroundColor: hexToRgba(accent, 0.18), color: accentSoft }}
                    >
                      +
                    </span>
                  )}
                  <span className="text-sm text-zinc-300">
                    {logoFile ? 'Replace logo' : 'Upload PNG, JPG, or WebP'}
                  </span>
                  <span className="text-xs text-zinc-500">Wide logos work best · max 2 MB</span>
                  <input
                    id="sponsor-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
              </div>

              <div>
                <FieldLabel htmlFor="sponsor-url">Website (optional)</FieldLabel>
                <input
                  id="sponsor-url"
                  value={sponsorUrl}
                  onChange={(event) => setSponsorUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://example.com"
                  inputMode="url"
                  autoComplete="url"
                />
              </div>

              <div>
                <FieldLabel htmlFor="sponsor-message">Note to organizer (optional)</FieldLabel>
                <textarea
                  id="sponsor-message"
                  value={sponsorMessage}
                  onChange={(event) => setSponsorMessage(event.target.value)}
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="Anything they should know?"
                />
              </div>
            </div>
          ) : null}

          {step === 'confirm' && selectedTier ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-zinc-400">
                Review your sponsorship, then continue to secure checkout.
              </p>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-4">
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div
                      className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl border px-2"
                      style={{
                        borderColor: hexToRgba(accent, 0.28),
                        backgroundColor: hexToRgba(accent, 0.08),
                      }}
                    >
                      <Image
                        src={logoPreview}
                        alt=""
                        width={120}
                        height={40}
                        className="h-8 w-auto max-w-full object-contain"
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-50">{sponsorName}</p>
                    {sponsorUrl.trim() ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{sponsorUrl.trim()}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/5 pt-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tier</p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-100">{selectedTier.name}</p>
                  </div>
                  <p className="text-right text-lg font-semibold tabular-nums text-zinc-50">
                    {formatTierPrice(selectedTier.price_cents, selectedTier.currency)}
                    <span className="text-sm font-normal text-zinc-500">/mo</span>
                  </p>
                </div>

                {sponsorMessage.trim() ? (
                  <p className="mt-3 rounded-xl bg-zinc-900/80 px-3 py-2 text-xs leading-relaxed text-zinc-400">
                    “{sponsorMessage.trim()}”
                  </p>
                ) : null}
              </div>

              <p
                className="rounded-xl border px-3.5 py-3 text-xs leading-relaxed"
                style={{
                  color: accentSoft,
                  borderColor: hexToRgba(accent, 0.35),
                  backgroundColor: hexToRgba(accent, 0.12),
                }}
              >
                {sponsorshipRefundPolicyText(orgName, platformFeePercent)}
              </p>
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {step !== 'tier' ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep(step === 'confirm' ? 'details' : 'tier')
              }}
              disabled={pending}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-transparent px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900/60 disabled:opacity-50 sm:w-auto sm:px-5"
            >
              Back
            </button>
          ) : null}

          {step === 'tier' ? (
            <button
              type="button"
              onClick={goNextFromTier}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:flex-1"
              style={{ backgroundColor: accent, color: accentFg }}
            >
              Continue
            </button>
          ) : null}

          {step === 'details' ? (
            <button
              type="button"
              onClick={goNextFromDetails}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:flex-1"
              style={{ backgroundColor: accent, color: accentFg }}
            >
              Continue
            </button>
          ) : null}

          {step === 'confirm' ? (
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={pending}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110 disabled:opacity-60 sm:flex-1"
              style={{ backgroundColor: accent, color: accentFg }}
            >
              {pending ? 'Preparing checkout…' : 'Continue to payment'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
