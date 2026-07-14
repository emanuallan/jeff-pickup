import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disconnectOrgStripeAccount } from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

describe('disconnectOrgStripeAccount', () => {
  const accountsUpdate = vi.fn()
  const accountsDel = vi.fn()
  const rpc = vi.fn()

  beforeEach(() => {
    accountsUpdate.mockReset()
    accountsDel.mockReset()
    rpc.mockReset()

    accountsUpdate.mockResolvedValue({ id: 'acct_1' })
    accountsDel.mockResolvedValue({ id: 'acct_1', deleted: true })
    rpc.mockResolvedValue({ error: null })

    vi.mocked(getStripe).mockReturnValue({
      accounts: {
        update: accountsUpdate,
        del: accountsDel,
      },
    } as never)

    vi.mocked(createAdminClient).mockReturnValue({
      rpc,
    } as never)
  })

  it('clears Stripe metadata, deletes the Express account, and removes the DB row', async () => {
    await disconnectOrgStripeAccount('org-1', 'acct_1')

    expect(accountsUpdate).toHaveBeenCalledWith('acct_1', {
      metadata: { org_id: '', org_slug: '' },
    })
    expect(accountsDel).toHaveBeenCalledWith('acct_1')
    expect(rpc).toHaveBeenCalledWith('delete_org_stripe_account', { p_org_id: 'org-1' })
  })

  it('still unlinks in the DB when Stripe delete fails', async () => {
    accountsDel.mockRejectedValue(new Error('Account has a balance'))

    await disconnectOrgStripeAccount('org-1', 'acct_1')

    expect(rpc).toHaveBeenCalledWith('delete_org_stripe_account', { p_org_id: 'org-1' })
  })

  it('throws when the delete RPC fails', async () => {
    rpc.mockResolvedValue({ error: { message: 'permission denied' } })

    await expect(disconnectOrgStripeAccount('org-1', 'acct_1')).rejects.toThrow(
      /delete_org_stripe_account failed/,
    )
  })
})
