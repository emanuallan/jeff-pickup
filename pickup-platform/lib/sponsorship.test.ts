import { describe, expect, it } from 'vitest'
import {
  canApproveSponsorship,
  canDeclineSponsorship,
  isSponsorshipsActiveLocally,
  parsePublicSponsors,
  resolveSponsorRefundAmountCents,
  sponsorLogoSizeForAmount,
  sponsorRefundAmountCents,
  sortPublicSponsorsByAmount,
  sortSponsorshipTiersForPublicDisplay,
  sponsorshipRefundPolicyText,
  buildSponsorshipOverviewStats,
  validateSponsorLogoUrl,
  validateSponsorName,
  validateTierPriceCents,
} from '@/lib/sponsorship'

describe('sponsorship validators', () => {
  it('validates tier price bounds', () => {
    expect(validateTierPriceCents(499)).toMatch(/Minimum/)
    expect(validateTierPriceCents(500)).toBeNull()
  })

  it('requires sponsor name', () => {
    expect(validateSponsorName('')).toMatch(/required/)
    expect(validateSponsorName('Acme Co')).toBeNull()
  })

  it('requires sponsor logo from our bucket', () => {
    const base = 'https://example.supabase.co/storage/v1/object/public/organizr_public'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    const valid = `${base}/sponsor-logos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/logo_20260101120000_ab12cd.png`
    expect(validateSponsorLogoUrl(valid)).toBeNull()
    expect(validateSponsorLogoUrl('https://evil.example/logo.png')).toMatch(/not valid/)
  })
})

describe('sponsorship lifecycle helpers', () => {
  it('gates active sponsorships locally', () => {
    expect(
      isSponsorshipsActiveLocally({
        featureEnabled: true,
        introText: 'Support us',
        hasActiveTier: true,
        chargesEnabled: true,
      }),
    ).toBe(true)
    expect(
      isSponsorshipsActiveLocally({
        featureEnabled: false,
        introText: 'Support us',
        hasActiveTier: true,
        chargesEnabled: true,
      }),
    ).toBe(false)
  })

  it('refunds the sponsor payment minus the platform fee', () => {
    expect(sponsorRefundAmountCents(2500, 125)).toBe(2375)
    expect(sponsorRefundAmountCents(1000, 1000)).toBe(0)
  })

  it('treats a prior sponsor refund (fee left on charge) as already done', () => {
    expect(
      resolveSponsorRefundAmountCents({
        grossAmountCents: 2500,
        amountRefundedCents: 2375,
        reportedApplicationFeeCents: 125,
        platformFeePercent: 5,
      }),
    ).toEqual({ refundAmountCents: 0, alreadyRefundedSponsorPortion: true })
  })

  it('refunds the sponsor portion on a fresh charge', () => {
    expect(
      resolveSponsorRefundAmountCents({
        grossAmountCents: 2500,
        amountRefundedCents: 0,
        reportedApplicationFeeCents: 125,
        platformFeePercent: 5,
      }),
    ).toEqual({ refundAmountCents: 2375, alreadyRefundedSponsorPortion: false })
  })

  it('describes the non-refundable platform fee policy', () => {
    expect(sponsorshipRefundPolicyText('Demo FC', 5)).toContain(
      "Organizr's 5% platform fee, which is non-refundable",
    )
  })

  it('builds simple console overview stats', () => {
    expect(
      buildSponsorshipOverviewStats([
        { status: 'pending_approval', monthly_amount_cents: 2500 },
        { status: 'approved', monthly_amount_cents: 2500 },
        { status: 'hidden', monthly_amount_cents: 5000 },
        { status: 'declined', monthly_amount_cents: 2500 },
        { status: 'canceled', monthly_amount_cents: 2500 },
      ]),
    ).toEqual({
      pendingCount: 1,
      activeCount: 1,
      hiddenCount: 1,
      monthlyRecurringCents: 7500,
      historyCount: 2,
    })
  })

  it('checks approval transitions', () => {
    expect(canApproveSponsorship('pending_approval')).toBe(true)
    expect(canApproveSponsorship('approved')).toBe(false)
    expect(canDeclineSponsorship('approved')).toBe(true)
  })
})

describe('parsePublicSponsors', () => {
  it('parses sponsor rows', () => {
    const sponsors = parsePublicSponsors([
      {
        id: '1',
        sponsor_name: 'Acme',
        logo_url: 'https://example.com/logo.png',
        sponsor_url: 'https://acme.test',
        monthly_amount_cents: 5000,
      },
    ])
    expect(sponsors).toHaveLength(1)
    expect(sponsors[0]?.sponsor_name).toBe('Acme')
    expect(sponsors[0]?.monthly_amount_cents).toBe(5000)
  })
})

describe('public sponsorship hierarchy', () => {
  it('sorts tiers highest price first', () => {
    const sorted = sortSponsorshipTiersForPublicDisplay([
      {
        id: 'a',
        name: 'Supporter',
        description: '',
        price_cents: 2500,
        currency: 'usd',
        sort_order: 0,
      },
      {
        id: 'b',
        name: 'Champion',
        description: '',
        price_cents: 10000,
        currency: 'usd',
        sort_order: 1,
      },
    ])
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('sizes logos by relative amount', () => {
    expect(sponsorLogoSizeForAmount(5000, [5000, 5000])).toBe('md')
    expect(sponsorLogoSizeForAmount(10000, [10000, 2500])).toBe('lg')
    expect(sponsorLogoSizeForAmount(2500, [10000, 2500])).toBe('sm')
    expect(sponsorLogoSizeForAmount(7500, [10000, 7500, 2500])).toBe('md')
  })

  it('sorts sponsors by amount descending', () => {
    const sorted = sortPublicSponsorsByAmount([
      {
        id: '1',
        sponsor_name: 'Low',
        logo_url: 'https://example.com/a.png',
        sponsor_url: null,
        monthly_amount_cents: 2500,
      },
      {
        id: '2',
        sponsor_name: 'High',
        logo_url: 'https://example.com/b.png',
        sponsor_url: null,
        monthly_amount_cents: 10000,
      },
    ])
    expect(sorted.map((s) => s.id)).toEqual(['2', '1'])
  })
})
