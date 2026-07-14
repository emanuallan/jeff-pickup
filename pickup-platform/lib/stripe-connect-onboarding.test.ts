import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConnectAccountLink, createConnectExpressAccount } from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

describe('Stripe Connect onboarding profile url', () => {
  const accountsCreate = vi.fn()
  const accountsUpdate = vi.fn()
  const accountLinksCreate = vi.fn()
  const rpc = vi.fn()

  beforeEach(() => {
    accountsCreate.mockReset()
    accountsUpdate.mockReset()
    accountLinksCreate.mockReset()
    rpc.mockReset()

    accountsCreate.mockResolvedValue({
      id: 'acct_1',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    })
    accountsUpdate.mockResolvedValue({ id: 'acct_1' })
    accountLinksCreate.mockResolvedValue({ url: 'https://stripe.test/onboard' })
    rpc.mockResolvedValue({ error: null })

    vi.mocked(getStripe).mockReturnValue({
      accounts: {
        create: accountsCreate,
        update: accountsUpdate,
      },
      accountLinks: {
        create: accountLinksCreate,
      },
    } as never)

    vi.mocked(createAdminClient).mockReturnValue({
      rpc,
    } as never)
  })

  it('prefills business website with the vanity org host', async () => {
    await createConnectExpressAccount('org-1', 'Demo Group', 'demo')

    expect(accountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        business_profile: {
          name: 'Demo Group',
          url: 'https://demo.organizr.co',
        },
      }),
    )
  })

  it('refreshes business website to the vanity host before account links', async () => {
    await createConnectAccountLink(
      'acct_1',
      'test',
      '/api/console/test/sponsorship/connect',
      '/api/console/test/sponsorship/connect/return',
    )

    expect(accountsUpdate).toHaveBeenCalledWith('acct_1', {
      business_profile: {
        url: 'https://test.organizr.co',
      },
    })
    expect(accountLinksCreate).toHaveBeenCalled()
  })
})
