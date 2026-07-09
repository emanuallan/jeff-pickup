import {
  SPONSORSHIP_MAX_TIERS,
  validateTierDescription,
  validateTierName,
  validateTierPriceCents,
} from '@/lib/sponsorship'

export type ParsedSponsorshipTierFields = {
  tierId: string | null
  name: string
  description: string
  priceCents: number
}

export function parseSponsorshipTierFormData(
  formData: FormData,
): { ok: true; values: ParsedSponsorshipTierFields } | { ok: false; error: string } {
  const tierIdRaw = String(formData.get('tierId') ?? '').trim()
  const tierId = tierIdRaw || null
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const priceRaw = String(formData.get('priceDollars') ?? '').trim()
  const priceDollars = Number(priceRaw)

  const nameError = validateTierName(name)
  if (nameError) return { ok: false, error: nameError }

  const descriptionError = validateTierDescription(description)
  if (descriptionError) return { ok: false, error: descriptionError }

  if (!Number.isFinite(priceDollars) || priceDollars <= 0) {
    return { ok: false, error: 'Enter a valid monthly price.' }
  }

  const priceCents = Math.round(priceDollars * 100)
  const priceError = validateTierPriceCents(priceCents)
  if (priceError) return { ok: false, error: priceError }

  return {
    ok: true,
    values: { tierId, name, description, priceCents },
  }
}

export function parseSponsorshipIntroFormData(
  formData: FormData,
): { ok: true; introText: string } | { ok: false; error: string } {
  const introText = String(formData.get('introText') ?? '').trim()
  if (!introText) {
    return { ok: false, error: 'Sponsorship page text is required.' }
  }
  return { ok: true, introText }
}

export function assertTierCountLimit(currentCount: number): string | null {
  if (currentCount >= SPONSORSHIP_MAX_TIERS) {
    return `You can have at most ${SPONSORSHIP_MAX_TIERS} tiers.`
  }
  return null
}
