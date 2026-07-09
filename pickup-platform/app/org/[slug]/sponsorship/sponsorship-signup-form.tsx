'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { PublicSponsorshipTier } from '@/lib/sponsorship'
import { MAX_ORG_LOGO_BYTES, ORG_LOGO_MIME_TYPES } from '@/lib/org-logo'

type Props = {
  slug: string
  orgName: string
  tiers: PublicSponsorshipTier[]
}

export function SponsorshipSignupForm({ slug, orgName, tiers }: Props) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 ? tiers[0]?.id ?? null : null,
  )
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorUrl, setSponsorUrl] = useState('')
  const [sponsorMessage, setSponsorMessage] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === selectedTierId) ?? null,
    [tiers, selectedTierId],
  )

  function handleLogoChange(file: File | null) {
    setLogoFile(file)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
    }
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleContinue() {
    setError(null)

    if (!selectedTier) {
      setError('Choose a sponsorship tier.')
      return
    }
    if (!sponsorName.trim()) {
      setError('Company name is required.')
      return
    }
    if (!logoFile) {
      setError('Company logo is required.')
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
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const selected = selectedTierId === tier.id
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTierId(tier.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? 'border-white/30 bg-white/10'
                  : 'border-white/10 bg-zinc-950/30 hover:border-white/20'
              }`}
            >
              <p className="font-medium text-zinc-100">{tier.name}</p>
              <p className="mt-1 text-sm text-zinc-400">
                ${(tier.price_cents / 100).toFixed(0)}/month
              </p>
              {tier.description ? (
                <p className="mt-2 text-sm text-zinc-500">{tier.description}</p>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-5">
        <div>
          <label className="text-sm font-medium text-zinc-200" htmlFor="sponsor-name">
            Company name
          </label>
          <input
            id="sponsor-name"
            value={sponsorName}
            onChange={(event) => setSponsorName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-white/20"
            placeholder={`Support ${orgName}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-200" htmlFor="sponsor-logo">
            Company logo
          </label>
          <input
            id="sponsor-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">
            PNG, JPG, or WebP. Wide logos work best (e.g. 400×100px).
          </p>
          {logoPreview ? (
            <Image
              src={logoPreview}
              alt="Logo preview"
              width={200}
              height={50}
              className="mt-3 h-10 w-auto max-w-[200px] object-contain"
              unoptimized
            />
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-200" htmlFor="sponsor-url">
            Website (optional)
          </label>
          <input
            id="sponsor-url"
            value={sponsorUrl}
            onChange={(event) => setSponsorUrl(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-white/20"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-200" htmlFor="sponsor-message">
            Message to organizer (optional)
          </label>
          <textarea
            id="sponsor-message"
            value={sponsorMessage}
            onChange={(event) => setSponsorMessage(event.target.value)}
            rows={3}
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-white/20"
          />
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="button"
          onClick={handleContinue}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-60"
        >
          {pending ? 'Preparing checkout…' : 'Continue to payment'}
        </button>
      </div>
    </div>
  )
}
