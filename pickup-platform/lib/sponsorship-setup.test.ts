import { describe, expect, it } from 'vitest'
import { isSponsorshipSetupComplete, sponsorshipSetupSearch } from './sponsorship-setup'

describe('isSponsorshipSetupComplete', () => {
  it('requires Stripe, a tier, and the public feature flag', () => {
    expect(
      isSponsorshipSetupComplete({
        stripeReady: true,
        activeTiersCount: 1,
        sponsorshipsEnabled: true,
      }),
    ).toBe(true)

    expect(
      isSponsorshipSetupComplete({
        stripeReady: false,
        activeTiersCount: 1,
        sponsorshipsEnabled: true,
      }),
    ).toBe(false)

    expect(
      isSponsorshipSetupComplete({
        stripeReady: true,
        activeTiersCount: 0,
        sponsorshipsEnabled: true,
      }),
    ).toBe(false)

    expect(
      isSponsorshipSetupComplete({
        stripeReady: true,
        activeTiersCount: 2,
        sponsorshipsEnabled: false,
      }),
    ).toBe(false)
  })
})

describe('sponsorshipSetupSearch', () => {
  it('omits empty values', () => {
    expect(sponsorshipSetupSearch({ connected: '1', connect_error: undefined })).toBe(
      '?connected=1',
    )
    expect(sponsorshipSetupSearch({})).toBe('')
  })
})
