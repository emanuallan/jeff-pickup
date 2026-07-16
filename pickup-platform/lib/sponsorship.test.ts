import { describe, expect, it } from 'vitest'
import {
  canApproveSponsorship,
  canCancelSponsorship,
  canDeclineSponsorship,
  collectTierIdsLockedBySponsors,
  isSponsorshipCancelMode,
  isSponsorshipsActiveLocally,
  orgHasSponsorshipsBlockingStripeDisconnect,
  parsePublicSponsors,
  resolveSponsorRefundAmountCents,
  sponsorLogoSizeForAmount,
  sponsorRefundAmountCents,
  sortPublicSponsorsByAmount,
  sortSponsorshipTiersForPublicDisplay,
  moveTierInOrder,
  sponsorshipBlocksStripeDisconnect,
  buildSponsorshipPageShareCopy,
  summarizeSponsorshipTierPrices,
  sponsorshipRefundPolicyText,
  sponsorshipStatusLocksTier,
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

  it('refunds the sponsor payment minus platform + estimated Stripe fees', () => {
    // $25 → 5% ($1.25) + 2.9%+$0.30 ($1.03) = $2.28 retain → $22.72 refund
    expect(sponsorRefundAmountCents(2500, 125 + 103)).toBe(2272)
    expect(sponsorRefundAmountCents(1000, 1000)).toBe(0)
  })

  it('treats a prior sponsor refund (retain left on charge) as already done', () => {
    expect(
      resolveSponsorRefundAmountCents({
        grossAmountCents: 2500,
        amountRefundedCents: 2280,
        reportedApplicationFeeCents: 125,
        reportedTotalFeeCents: 220,
        platformFeePercent: 5,
      }),
    ).toEqual({
      refundAmountCents: 0,
      alreadyRefundedSponsorPortion: true,
      retainCents: 220,
    })
  })

  it('refunds the sponsor portion on a fresh charge using total reported fees', () => {
    expect(
      resolveSponsorRefundAmountCents({
        grossAmountCents: 2500,
        amountRefundedCents: 0,
        reportedApplicationFeeCents: 125,
        reportedTotalFeeCents: 220,
        platformFeePercent: 5,
      }),
    ).toEqual({
      refundAmountCents: 2280,
      alreadyRefundedSponsorPortion: false,
      retainCents: 220,
    })
  })

  it('falls back to estimated Stripe processing when fees are not reported', () => {
    expect(
      resolveSponsorRefundAmountCents({
        grossAmountCents: 2500,
        amountRefundedCents: 0,
        reportedApplicationFeeCents: 125,
        reportedStripeProcessingFeeCents: null,
        reportedTotalFeeCents: null,
        platformFeePercent: 5,
      }),
    ).toEqual({
      refundAmountCents: 2272,
      alreadyRefundedSponsorPortion: false,
      retainCents: 228,
    })
  })

  it('describes the non-refundable processing + platform fee policy', () => {
    const text = sponsorshipRefundPolicyText('Demo FC', 5)
    expect(text).toContain(
      "card processing fees and Organizr's 5% platform fee, which are non-refundable",
    )
    expect(text).toContain('contact the group admins')
    expect(text).toContain('self-serve cancellation is still under development and coming soon')
  })

  it('summarizes sponsorship tier prices for share previews', () => {
    expect(
      summarizeSponsorshipTierPrices([
        { id: '1', name: 'Gold', description: '', price_cents: 5000, currency: 'usd', sort_order: 0 },
      ]),
    ).toBe('$50/month')

    expect(
      summarizeSponsorshipTierPrices([
        { id: '1', name: 'Bronze', description: '', price_cents: 2500, currency: 'usd', sort_order: 0 },
        { id: '2', name: 'Gold', description: '', price_cents: 10000, currency: 'usd', sort_order: 1 },
      ]),
    ).toBe('$25–$100/month')
  })

  it('builds sponsorship share copy from intro and tiers', () => {
    const share = buildSponsorshipPageShareCopy('Demo FC', {
      active: true,
      intro_text: 'Help us keep the pitch booked every week.',
      tiers: [
        { id: '1', name: 'Partner', description: '', price_cents: 2500, currency: 'usd', sort_order: 0 },
      ],
    })

    expect(share.title).toBe('Support Demo FC')
    expect(share.description).toContain('Help us keep the pitch booked every week.')
    expect(share.description).toContain('Monthly sponsorship from $25/month.')
    expect(share.ogSubline).toBe('$25/month')
  })

  it('builds fallback sponsorship share copy when the page is inactive', () => {
    const share = buildSponsorshipPageShareCopy('Demo FC', {
      active: false,
      intro_text: null,
      tiers: [],
    })

    expect(share.title).toBe('Demo FC · Sponsorship')
    expect(share.description).toContain("aren't available right now")
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
    expect(canDeclineSponsorship('pending_approval')).toBe(true)
    expect(canDeclineSponsorship('approved')).toBe(false)
    expect(canCancelSponsorship('approved')).toBe(true)
    expect(canCancelSponsorship('hidden')).toBe(true)
    expect(canCancelSponsorship('pending_approval')).toBe(false)
    expect(isSponsorshipCancelMode('refund_now')).toBe(true)
    expect(isSponsorshipCancelMode('end_of_period')).toBe(true)
    expect(isSponsorshipCancelMode('refund_full')).toBe(true)
    expect(isSponsorshipCancelMode('nope')).toBe(false)
    expect(sponsorshipStatusLocksTier('approved')).toBe(true)
    expect(sponsorshipStatusLocksTier('hidden')).toBe(true)
    expect(sponsorshipStatusLocksTier('pending_approval')).toBe(false)
    expect(sponsorshipBlocksStripeDisconnect('pending_approval')).toBe(true)
    expect(sponsorshipBlocksStripeDisconnect('approved')).toBe(true)
    expect(sponsorshipBlocksStripeDisconnect('hidden')).toBe(true)
    expect(sponsorshipBlocksStripeDisconnect('canceled')).toBe(false)
    expect(
      orgHasSponsorshipsBlockingStripeDisconnect([
        { status: 'canceled' },
        { status: 'pending_approval' },
      ]),
    ).toBe(true)
    expect(orgHasSponsorshipsBlockingStripeDisconnect([{ status: 'declined' }])).toBe(false)
    expect(
      collectTierIdsLockedBySponsors([
        { tier_id: 'a', status: 'approved' },
        { tier_id: 'a', status: 'hidden' },
        { tier_id: 'b', status: 'pending_approval' },
        { tier_id: 'c', status: 'canceled' },
      ]),
    ).toEqual(['a'])
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
  it('sorts tiers by organizer sort_order, not price', () => {
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
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('moves tiers one step in the ordered id list', () => {
    expect(moveTierInOrder(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c'])
    expect(moveTierInOrder(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b'])
    expect(moveTierInOrder(['a', 'b', 'c'], 'a', 'up')).toBeNull()
    expect(moveTierInOrder(['a', 'b', 'c'], 'c', 'down')).toBeNull()
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
