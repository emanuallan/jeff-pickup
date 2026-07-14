import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  syncOrgBrandingToConnectAccount,
  syncOrgBrandingToStripeIfConnected,
} from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
  isStripeConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

describe('syncOrgBrandingToConnectAccount', () => {
  const accountsUpdate = vi.fn()
  const filesCreate = vi.fn()

  beforeEach(() => {
    accountsUpdate.mockReset()
    filesCreate.mockReset()
    vi.mocked(isStripeConfigured).mockReturnValue(true)

    accountsUpdate.mockResolvedValue({ id: 'acct_1' })
    filesCreate
      .mockResolvedValueOnce({ id: 'file_logo' })
      .mockResolvedValueOnce({ id: 'file_icon' })

    vi.mocked(getStripe).mockReturnValue({
      accounts: { update: accountsUpdate },
      files: { create: filesCreate },
    } as never)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      }),
    )
  })

  it('uploads logo/icon and updates account branding colors', async () => {
    await syncOrgBrandingToConnectAccount('acct_1', {
      logoUrl: 'https://cdn.example.com/logo.png',
      accentColor: '#112233',
    })

    expect(filesCreate).toHaveBeenCalledTimes(2)
    expect(accountsUpdate).toHaveBeenCalledWith('acct_1', {
      settings: {
        branding: {
          primary_color: '#112233',
          secondary_color: '#112233',
          logo: 'file_logo',
          icon: 'file_icon',
        },
      },
    })
  })

  it('still updates colors when logo fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    )

    await syncOrgBrandingToConnectAccount('acct_1', {
      logoUrl: 'https://cdn.example.com/missing.png',
      accentColor: '#ABCDEF',
    })

    expect(filesCreate).not.toHaveBeenCalled()
    expect(accountsUpdate).toHaveBeenCalledWith('acct_1', {
      settings: {
        branding: {
          primary_color: '#abcdef',
          secondary_color: '#abcdef',
        },
      },
    })
  })

  it('swallows Stripe update errors', async () => {
    accountsUpdate.mockRejectedValue(new Error('branding locked'))

    await expect(
      syncOrgBrandingToConnectAccount('acct_1', {
        logoUrl: null,
        accentColor: '#112233',
      }),
    ).resolves.toBeUndefined()
  })
})

describe('syncOrgBrandingToStripeIfConnected', () => {
  const accountsUpdate = vi.fn()
  const maybeSingle = vi.fn()

  beforeEach(() => {
    accountsUpdate.mockReset()
    maybeSingle.mockReset()
    vi.mocked(isStripeConfigured).mockReturnValue(true)

    accountsUpdate.mockResolvedValue({ id: 'acct_1' })
    vi.mocked(getStripe).mockReturnValue({
      accounts: { update: accountsUpdate },
      files: { create: vi.fn() },
    } as never)

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    } as never)
  })

  it('no-ops when the org has no connected account', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    await syncOrgBrandingToStripeIfConnected('org-1', {
      logoUrl: null,
      accentColor: '#112233',
    })

    expect(accountsUpdate).not.toHaveBeenCalled()
  })

  it('syncs when a connected account row exists', async () => {
    maybeSingle.mockResolvedValue({
      data: { stripe_account_id: 'acct_1' },
      error: null,
    })

    await syncOrgBrandingToStripeIfConnected('org-1', {
      logoUrl: null,
      accentColor: '#445566',
    })

    expect(accountsUpdate).toHaveBeenCalledWith(
      'acct_1',
      expect.objectContaining({
        settings: {
          branding: {
            primary_color: '#445566',
            secondary_color: '#445566',
          },
        },
      }),
    )
  })

  it('swallows lookup errors', async () => {
    maybeSingle.mockRejectedValue(new Error('db down'))

    await expect(
      syncOrgBrandingToStripeIfConnected('org-1', {
        logoUrl: null,
        accentColor: '#112233',
      }),
    ).resolves.toBeUndefined()
  })
})
