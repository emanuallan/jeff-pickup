'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createComplimentarySponsorship } from '../../sponsorship-actions'
import { ConsoleSubmitButton } from '../../_components/console-submit-button'
import { ConsoleSection, consoleInput, consoleLabel } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import {
  formatTierPrice,
  pickCheapestActiveSponsorshipTier,
  SPONSORSHIP_SPONSOR_NAME_MAX_LENGTH,
} from '@/lib/sponsorship'
import { MAX_ORG_LOGO_BYTES, ORG_LOGO_MIME_TYPES } from '@/lib/org-logo'

export type ComplimentaryTierOption = {
  id: string
  name: string
  price_cents: number
  currency: string
  sort_order: number
}

export function ComplimentarySponsorForm({
  orgSlug,
  tiers,
}: {
  orgSlug: string
  tiers: ComplimentaryTierOption[]
}) {
  const toast = useConsoleToast()
  const router = useRouter()
  const defaultTierId = pickCheapestActiveSponsorshipTier(tiers)?.id ?? ''
  const [tierId, setTierId] = useState(defaultTierId)
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorUrl, setSponsorUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const selectedTier = tiers.find((tier) => tier.id === tierId) ?? null

  function handleLogoChange(file: File | null) {
    setLogoFile(file)
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending || tiers.length === 0) return

    if (!tierId || !selectedTier) {
      toast.error('Choose a sponsorship tier.')
      return
    }
    if (!sponsorName.trim()) {
      toast.error('Company name is required.')
      return
    }
    if (!logoFile) {
      toast.error('Upload a logo image.')
      return
    }
    if (logoFile.size > MAX_ORG_LOGO_BYTES) {
      toast.error('Logo must be 2 MB or smaller.')
      return
    }
    if (!ORG_LOGO_MIME_TYPES.includes(logoFile.type as (typeof ORG_LOGO_MIME_TYPES)[number])) {
      toast.error('Logo must be a PNG, JPG, or WebP image.')
      return
    }

    setPending(true)
    try {
      const logoForm = new FormData()
      logoForm.set('slug', orgSlug)
      logoForm.set('logo', logoFile)

      const logoResponse = await fetch('/api/sponsorship/logo', {
        method: 'POST',
        body: logoForm,
      })
      const logoData = (await logoResponse.json()) as { error?: string; logo_url?: string }
      if (!logoResponse.ok || !logoData.logo_url) {
        toast.error(logoData.error ?? 'Could not upload logo.')
        return
      }

      const result = await createComplimentarySponsorship(orgSlug, {
        tierId,
        sponsorName: sponsorName.trim(),
        logoUrl: logoData.logo_url,
        sponsorUrl: sponsorUrl.trim(),
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }

      setSponsorName('')
      setSponsorUrl('')
      setTierId(defaultTierId)
      handleLogoChange(null)
      toast.success('Complimentary sponsor added.')
      router.refresh()
    } catch {
      toast.error('Could not add complimentary sponsor. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <ConsoleSection
      title="Add complimentary"
      description="Manual sponsor with no payment. Pick which tier they appear as for logo size."
    >
      {tiers.length === 0 ? (
        <p className="text-sm text-zinc-500">Create an active tier before adding complimentary sponsors.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={consoleLabel} htmlFor="complimentary-tier">
              Tier
            </label>
            <select
              id="complimentary-tier"
              value={tierId}
              onChange={(event) => setTierId(event.target.value)}
              className={`${consoleInput} mt-2`}
            >
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} · {formatTierPrice(tier.price_cents, tier.currency)}/mo
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">
              Display amount only — no charge. Currently{' '}
              {selectedTier
                ? formatTierPrice(selectedTier.price_cents, selectedTier.currency)
                : '—'}
              /mo.
            </p>
          </div>

          <div>
            <label className={consoleLabel} htmlFor="complimentary-name">
              Name
            </label>
            <input
              id="complimentary-name"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              maxLength={SPONSORSHIP_SPONSOR_NAME_MAX_LENGTH}
              className={`${consoleInput} mt-2`}
              placeholder="Sponsor name"
              autoComplete="organization"
            />
          </div>

          <div>
            <label className={consoleLabel} htmlFor="complimentary-url">
              Website (optional)
            </label>
            <input
              id="complimentary-url"
              value={sponsorUrl}
              onChange={(event) => setSponsorUrl(event.target.value)}
              className={`${consoleInput} mt-2`}
              placeholder="https://"
              inputMode="url"
              autoComplete="url"
            />
          </div>

          <div>
            <label className={consoleLabel} htmlFor="complimentary-logo">
              Logo
            </label>
            <input
              id="complimentary-logo"
              type="file"
              accept={ORG_LOGO_MIME_TYPES.join(',')}
              className="mt-2 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-white/15"
              onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
            />
            {logoPreview ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="relative size-14 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                  <Image src={logoPreview} alt="" fill className="object-contain p-1" unoptimized />
                </div>
                <button
                  type="button"
                  className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                  onClick={() => handleLogoChange(null)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <ConsoleSubmitButton pending={pending} pendingLabel="Adding…">
            Add complimentary sponsor
          </ConsoleSubmitButton>
        </form>
      )}
    </ConsoleSection>
  )
}
