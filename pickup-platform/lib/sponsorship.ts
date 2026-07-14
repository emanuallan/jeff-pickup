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
  /** Monthly amount from the sponsorship row — used for public logo hierarchy. */
  monthly_amount_cents: number | null
}

export type SponsorLogoSize = 'lg' | 'md' | 'sm'

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

/** US online card estimate: 2.9% + $0.30. Used when Stripe hasn't reported fees yet. */
export function estimateStripeCardProcessingFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  return Math.round(amountCents * 0.029) + 30
}

/**
 * Non-refundable amount on decline: Organizr application fee + Stripe processing
 * so the connected org is left roughly whole-dollar flat (not negative).
 */
export function sponsorDeclineRetainCents(input: {
  grossAmountCents: number
  applicationFeeCents: number
  /** Stripe processing only — exclude application fee. Null → estimate. */
  stripeProcessingFeeCents: number | null
}): number {
  const gross = Math.max(0, input.grossAmountCents)
  const applicationFee = Math.max(0, input.applicationFeeCents)
  const processing =
    input.stripeProcessingFeeCents != null &&
    Number.isFinite(input.stripeProcessingFeeCents) &&
    input.stripeProcessingFeeCents >= 0
      ? input.stripeProcessingFeeCents
      : estimateStripeCardProcessingFeeCents(gross)
  return Math.min(gross, applicationFee + Math.max(0, processing))
}

/** Sponsor refund on decline: charge minus non-refundable retain (fees). */
export function sponsorRefundAmountCents(
  chargeAmountCents: number,
  retainCents: number,
): number {
  if (!Number.isFinite(chargeAmountCents) || chargeAmountCents <= 0) return 0
  const retain = Number.isFinite(retainCents) ? Math.max(0, retainCents) : 0
  return Math.max(chargeAmountCents - retain, 0)
}

/**
 * Resolve how much of a charge to refund on decline while retaining
 * platform fee + Stripe processing.
 * Treats “only retain remains” (after a prior sponsor refund) as nothing left to refund.
 */
export function resolveSponsorRefundAmountCents(input: {
  grossAmountCents: number
  amountRefundedCents: number
  reportedApplicationFeeCents: number | null
  /** Balance-transaction fee excluding application_fee (stripe_fee, tax, etc.). */
  reportedStripeProcessingFeeCents?: number | null
  /**
   * Prefer total balance_transaction.fee when present (application + Stripe).
   * Avoids double-counting when fee_details already include both.
   */
  reportedTotalFeeCents?: number | null
  platformFeePercent: number
}): { refundAmountCents: number; alreadyRefundedSponsorPortion: boolean; retainCents: number } {
  const gross = Math.max(0, input.grossAmountCents)
  const amountRefunded = Math.max(0, input.amountRefundedCents)
  const remaining = Math.max(gross - amountRefunded, 0)

  if (remaining <= 0) {
    return { refundAmountCents: 0, alreadyRefundedSponsorPortion: true, retainCents: 0 }
  }

  const expectedAppFeeCents = Math.round((gross * input.platformFeePercent) / 100)
  const reportedApp = input.reportedApplicationFeeCents
  const applicationFeeCents =
    reportedApp != null && Number.isFinite(reportedApp) && reportedApp > 0 && reportedApp < gross
      ? reportedApp
      : expectedAppFeeCents

  const reportedTotal = input.reportedTotalFeeCents
  const retainCents =
    reportedTotal != null && Number.isFinite(reportedTotal) && reportedTotal > 0 && reportedTotal < gross
      ? reportedTotal
      : sponsorDeclineRetainCents({
          grossAmountCents: gross,
          applicationFeeCents,
          stripeProcessingFeeCents: input.reportedStripeProcessingFeeCents ?? null,
        })

  // Prior successful decline refund leaves only the non-refundable retain on the charge.
  if (amountRefunded > 0 && remaining <= retainCents) {
    return { refundAmountCents: 0, alreadyRefundedSponsorPortion: true, retainCents }
  }

  return {
    refundAmountCents: sponsorRefundAmountCents(remaining, retainCents),
    alreadyRefundedSponsorPortion: false,
    retainCents,
  }
}

export function formatPlatformFeePercent(platformFeePercent: number): string {
  return Number.isInteger(platformFeePercent)
    ? String(platformFeePercent)
    : platformFeePercent.toFixed(1).replace(/\.0$/, '')
}

export type SponsorshipOverviewInput = {
  status: string
  monthly_amount_cents: number
}

export type SponsorshipOverviewStats = {
  pendingCount: number
  activeCount: number
  hiddenCount: number
  monthlyRecurringCents: number
  historyCount: number
}

/** Quick-glance console stats from existing sponsorship rows (no payment ledger). */
export function buildSponsorshipOverviewStats(
  rows: SponsorshipOverviewInput[],
): SponsorshipOverviewStats {
  let pendingCount = 0
  let activeCount = 0
  let hiddenCount = 0
  let monthlyRecurringCents = 0
  let historyCount = 0

  for (const row of rows) {
    switch (row.status) {
      case 'pending_approval':
        pendingCount += 1
        break
      case 'approved':
        activeCount += 1
        monthlyRecurringCents += row.monthly_amount_cents
        break
      case 'hidden':
        hiddenCount += 1
        monthlyRecurringCents += row.monthly_amount_cents
        break
      case 'declined':
      case 'canceled':
      case 'payment_failed':
        historyCount += 1
        break
      default:
        break
    }
  }

  return {
    pendingCount,
    activeCount,
    hiddenCount,
    monthlyRecurringCents,
    historyCount,
  }
}

export function sponsorshipHistoryStatusLabel(status: string): string {
  switch (status) {
    case 'declined':
      return 'Declined'
    case 'canceled':
      return 'Canceled'
    case 'payment_failed':
      return 'Payment failed'
    default:
      return status
  }
}

export function sponsorshipHistoryDateIso(row: {
  status: string
  declined_at?: string | null
  canceled_at?: string | null
  created_at: string
  updated_at?: string | null
}): string {
  if (row.status === 'declined' && row.declined_at) return row.declined_at
  if (row.status === 'canceled' && row.canceled_at) return row.canceled_at
  return row.updated_at || row.created_at
}

export function formatSponsorshipConsoleDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function sponsorshipRefundPolicyText(orgName: string, platformFeePercent: number): string {
  const feeLabel = formatPlatformFeePercent(platformFeePercent)
  return `An organizer at ${orgName} will review your request before your logo goes live. If they decline, you're refunded except for card processing fees and Organizr's ${feeLabel}% platform fee.`
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

/** Highest price first so public pickers show prestige hierarchy. */
export function sortSponsorshipTiersForPublicDisplay(
  tiers: PublicSponsorshipTier[],
): PublicSponsorshipTier[] {
  return [...tiers].sort((a, b) => {
    if (b.price_cents !== a.price_cents) return b.price_cents - a.price_cents
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })
}

/** Relative logo size from amount vs other visible sponsors. */
export function sponsorLogoSizeForAmount(
  amountCents: number,
  allAmounts: ReadonlyArray<number>,
): SponsorLogoSize {
  const unique = [
    ...new Set(allAmounts.filter((n) => Number.isFinite(n) && n >= 0)),
  ].sort((a, b) => b - a)

  if (unique.length <= 1) return 'md'
  const index = unique.indexOf(amountCents)
  if (index < 0) return 'md'
  if (unique.length === 2) return index === 0 ? 'lg' : 'sm'

  const ratio = index / (unique.length - 1)
  if (ratio <= 0.34) return 'lg'
  if (ratio <= 0.67) return 'md'
  return 'sm'
}

export function sortPublicSponsorsByAmount(sponsors: PublicSponsor[]): PublicSponsor[] {
  return [...sponsors].sort((a, b) => {
    const amountA = a.monthly_amount_cents ?? 0
    const amountB = b.monthly_amount_cents ?? 0
    if (amountB !== amountA) return amountB - amountA
    return a.sponsor_name.localeCompare(b.sponsor_name)
  })
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
        monthly_amount_cents:
          typeof row.monthly_amount_cents === 'number' ? row.monthly_amount_cents : null,
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
