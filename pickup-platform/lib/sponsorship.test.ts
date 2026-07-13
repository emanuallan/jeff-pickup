import { describe, expect, it } from 'vitest'
import {
  canApproveSponsorship,
  canDeclineSponsorship,
  isSponsorshipsActiveLocally,
  parsePublicSponsors,
  sponsorRefundAmountCents,
  sponsorshipRefundPolicyText,
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

  it('describes the non-refundable platform fee policy', () => {
    expect(sponsorshipRefundPolicyText('Demo FC', 5)).toContain(
      "Organizr's 5% platform fee, which is non-refundable",
    )
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
      },
    ])
    expect(sponsors).toHaveLength(1)
    expect(sponsors[0]?.sponsor_name).toBe('Acme')
  })
})
