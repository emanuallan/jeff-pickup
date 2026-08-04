import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}))

import { createLinkIntent, redeemLinkIntent } from '@/lib/telegram/links'

describe('telegram link intents', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('creates a short-lived intent bound to user + pair token', async () => {
    rpc.mockResolvedValue({
      data: { id: 'A1B2C3D4', expires_at: '2026-08-04T20:00:00.000Z' },
      error: null,
    })

    const result = await createLinkIntent({
      orgId: 'org-1',
      telegramUserId: 99,
      telegramUsername: 'alex',
      pairToken: 'secret-pair-token',
    })

    expect(result.id).toBe('A1B2C3D4')
    expect(rpc).toHaveBeenCalledWith('create_telegram_link_intent', {
      p_org_id: 'org-1',
      p_telegram_user_id: '99',
      p_telegram_username: 'alex',
      p_pair_token: 'secret-pair-token',
      p_ttl_minutes: 30,
    })
  })

  it('redeems an intent for the matching telegram user', async () => {
    rpc.mockResolvedValue({
      data: {
        org_id: 'org-1',
        org_slug: 'jeff',
        org_name: 'Jeff',
        pair_token: 'secret-pair-token',
        telegram_user_id: 99,
      },
      error: null,
    })

    const redeemed = await redeemLinkIntent('A1B2C3D4', 99)
    expect(redeemed?.pair_token).toBe('secret-pair-token')
    expect(redeemed?.org_slug).toBe('jeff')
    expect(rpc).toHaveBeenCalledWith('redeem_telegram_link_intent', {
      p_intent_id: 'A1B2C3D4',
      p_telegram_user_id: '99',
    })
  })

  it('returns null when the intent is missing', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(redeemLinkIntent('MISSING', 99)).resolves.toBeNull()
  })

  it('surfaces expiry / wrong-user errors from the RPC', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'That start link belongs to a different Telegram account' },
    })
    await expect(redeemLinkIntent('A1B2C3D4', 1)).rejects.toThrow(
      /different Telegram account/,
    )
  })

  it('loads the latest open pair token for a telegram user', async () => {
    rpc.mockResolvedValue({
      data: {
        token: 'pair-tok',
        org_id: 'org-1',
        org_slug: 'jeff',
        org_name: 'Jeff',
        telegram_user_id: 99,
        telegram_username: 'alex',
        expires_at: '2026-08-04T20:00:00.000Z',
        used_at: null,
      },
      error: null,
    })

    const { getLatestOpenPairTokenForUser } = await import('@/lib/telegram/links')
    const row = await getLatestOpenPairTokenForUser(99)
    expect(row?.token).toBe('pair-tok')
    expect(row?.org_slug).toBe('jeff')
    expect(rpc).toHaveBeenCalledWith('get_open_telegram_pair_token_for_user', {
      p_telegram_user_id: '99',
    })
  })
})
