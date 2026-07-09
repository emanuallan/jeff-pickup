import { normalizeLinkUrl } from '@/lib/social-links'
import { parseOurBucketSponsorLogoPath } from '@/lib/sponsor-logo'

export const SPONSORSHIP_INTRO_MIN_LENGTH = 10
export const SPONSORSHIP_INTRO_MAX_LENGTH = 5_000
export const SPONSORSHIP_TIER_NAME_MAX_LENGTH = 40
export const SPONSORSHIP_TIER_DESCRIPTION_MAX_LENGTH = 500
export const SPONSORSHIP_SPONSOR_NAME_MAX_LENGTH = 80
export const SPONSORSHIP_MESSAGE_MAX_LENGTH = 300
export const SPONSORSHIP_MAX_TIERS = 6
export const SPONSORSHIP_MIN_PRICE_CENTS = 500
export const SPONSORSHIP_MAX_PRICE_CENTS = 1_000_000
export const DEFAULT_PLATFORM_FEE_PERCENT = 5

export type SponsorshipStatus =
  | 'pending_approval'
  | 'approved'
  | 'declined'
  | 'hidden'
  | 'canceled'
  | 'payment_failed'

export type OrgSponsorshipSettings = {
  intro_text: string
  published_at: string | null
}

export type PublicSponsor = {
  id: string
  sponsor_name: string
  logo_url: string
  sponsor_url: string | null
}

export type PublicSponsorshipTier = {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  sort_order: number
}

export type PublicSponsorshipPage = {
  active: boolean
  intro_text: string | null
  tiers: PublicSponsorshipTier[]
}

export function parseOrgSponsorshipSettings(raw: unknown): OrgSponsorshipSettings | null {
  const settings = raw as Partial<OrgSponsorshipSettings> | null | undefined
  if (!settings || typeof settings !== 'object') {
    return null
  }

  const introText = typeof settings.intro_text === 'string' ? settings.intro_text.trim() : ''
  const publishedAt =
    typeof settings.published_at === 'string' && settings.published_at.length > 0
      ? settings.published_at
      : null

  if (!introText && !publishedAt) {
    return null
  }

  return {
    intro_text: introText,
    published_at: publishedAt,
  }
}

export function orgSponsorshipSettings(
  settings: { sponsorships?: OrgSponsorshipSettings | null } | null | undefined,
): OrgSponsorshipSettings | null {
  return parseOrgSponsorshipSettings(settings?.sponsorships)
}

export function validateSponsorshipIntroText(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.length < SPONSORSHIP_INTRO_MIN_LENGTH) {
    return `Sponsorship page text must be at least ${SPONSORSHIP_INTRO_MIN_LENGTH} characters.`
  }
  if (trimmed.length > SPONSORSHIP_INTRO_MAX_LENGTH) {
    return `Sponsorship page text must be at most ${SPONSORSHIP_INTRO_MAX_LENGTH} characters.`
  }
  return null
}

export function validateTierName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Tier name is required.'
  if (trimmed.length > SPONSORSHIP_TIER_NAME_MAX_LENGTH) {
    return `Tier name must be at most ${SPONSORSHIP_TIER_NAME_MAX_LENGTH} characters.`
  }
  return null
}

export function validateTierDescription(description: string): string | null {
  if (description.length > SPONSORSHIP_TIER_DESCRIPTION_MAX_LENGTH) {
    return `Tier description must be at most ${SPONSORSHIP_TIER_DESCRIPTION_MAX_LENGTH} characters.`
  }
  return null
}

export function validateTierPriceCents(priceCents: number): string | null {
  if (!Number.isInteger(priceCents)) {
    return 'Price must be a whole number of cents.'
  }
  if (priceCents < SPONSORSHIP_MIN_PRICE_CENTS) {
    return `Minimum monthly price is $${(SPONSORSHIP_MIN_PRICE_CENTS / 100).toFixed(2)}.`
  }
  if (priceCents > SPONSORSHIP_MAX_PRICE_CENTS) {
    return 'Price is too high.'
  }
  return null
}

export function validateSponsorName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Company name is required.'
  if (trimmed.length > SPONSORSHIP_SPONSOR_NAME_MAX_LENGTH) {
    return `Company name must be at most ${SPONSORSHIP_SPONSOR_NAME_MAX_LENGTH} characters.`
  }
  return null
}

export function validateSponsorUrl(url: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = url.trim()
  if (!trimmed) {
    return { ok: true, value: null }
  }
  const normalized = normalizeLinkUrl(trimmed)
  if (!normalized) {
    return { ok: false, error: 'Website URL is not valid.' }
  }
  return { ok: true, value: normalized }
}

export function validateSponsorMessage(message: string): string | null {
  if (message.length > SPONSORSHIP_MESSAGE_MAX_LENGTH) {
    return `Message must be at most ${SPONSORSHIP_MESSAGE_MAX_LENGTH} characters.`
  }
  return null
}

export function validateSponsorLogoUrl(logoUrl: string): string | null {
  const trimmed = logoUrl.trim()
  if (!trimmed) return 'Company logo is required.'
  if (!parseOurBucketSponsorLogoPath(trimmed)) {
    return 'Logo URL is not valid.'
  }
  return null
}

export function isSponsorshipsActiveLocally(input: {
  featureEnabled: boolean
  introText: string | null | undefined
  hasActiveTier: boolean
  chargesEnabled: boolean
}): boolean {
  return (
    input.featureEnabled &&
    !!input.introText?.trim() &&
    input.hasActiveTier &&
    input.chargesEnabled
  )
}

export function formatTierPrice(priceCents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

export function canApproveSponsorship(status: SponsorshipStatus): boolean {
  return status === 'pending_approval'
}

export function canDeclineSponsorship(status: SponsorshipStatus): boolean {
  return status === 'pending_approval' || status === 'approved' || status === 'payment_failed'
}

export function canToggleSponsorshipHidden(status: SponsorshipStatus): boolean {
  return status === 'approved' || status === 'hidden'
}

export function parsePublicSponsors(raw: unknown): PublicSponsor[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item as Partial<PublicSponsor>
      if (
        typeof row.id !== 'string' ||
        typeof row.sponsor_name !== 'string' ||
        typeof row.logo_url !== 'string'
      ) {
        return null
      }
      return {
        id: row.id,
        sponsor_name: row.sponsor_name,
        logo_url: row.logo_url,
        sponsor_url: typeof row.sponsor_url === 'string' ? row.sponsor_url : null,
      }
    })
    .filter((item): item is PublicSponsor => item !== null)
}

export function parsePublicSponsorshipPage(raw: unknown): PublicSponsorshipPage | null {
  if (!raw || typeof raw !== 'object') return null
  const page = raw as Partial<PublicSponsorshipPage>
  const tiers = Array.isArray(page.tiers)
    ? page.tiers
        .map((tier) => {
          const row = tier as Partial<PublicSponsorshipTier>
          if (
            typeof row.id !== 'string' ||
            typeof row.name !== 'string' ||
            typeof row.description !== 'string' ||
            typeof row.price_cents !== 'number'
          ) {
            return null
          }
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            price_cents: row.price_cents,
            currency: typeof row.currency === 'string' ? row.currency : 'usd',
            sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
          }
        })
        .filter((tier): tier is PublicSponsorshipTier => tier !== null)
    : []

  return {
    active: page.active === true,
    intro_text: typeof page.intro_text === 'string' ? page.intro_text : null,
    tiers,
  }
}
