import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const getLatestOpenPairTokenForUser = vi.fn()
const getParticipantIdForTelegramUser = vi.fn()
const completeTelegramPair = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle,
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/telegram/links', () => ({
  getLatestOpenPairTokenForUser: (...args: unknown[]) => getLatestOpenPairTokenForUser(...args),
  getParticipantIdForTelegramUser: (...args: unknown[]) => getParticipantIdForTelegramUser(...args),
  completeTelegramPair: (...args: unknown[]) => completeTelegramPair(...args),
}))

import {
  assertTelegramContactIsOwn,
  handleTelegramContactPair,
  resolveTelegramPairNames,
} from '@/lib/telegram/contact-pair'

const pending = {
  token: 'pair-tok',
  org_id: 'org-1',
  org_slug: 'jeff',
  org_name: 'Jeff Soccer',
  telegram_user_id: 42,
  telegram_username: 'alex',
  expires_at: '2099-01-01T00:00:00.000Z',
  used_at: null,
}

describe('assertTelegramContactIsOwn', () => {
  it('requires Telegram-verified own contact', () => {
    expect(
      assertTelegramContactIsOwn(1, { phone_number: '+12025551234' }),
    ).toMatch(/Share phone number/)
    expect(
      assertTelegramContactIsOwn(1, {
        phone_number: '+12025551234',
        user_id: 2,
      }),
    ).toMatch(/isn't your own/)
    expect(
      assertTelegramContactIsOwn(1, {
        phone_number: '+12025551234',
        user_id: 1,
      }),
    ).toBeNull()
  })
})

describe('resolveTelegramPairNames', () => {
  it('prefers contact names then profile names', () => {
    expect(
      resolveTelegramPairNames({
        contactFirst: 'Alex',
        contactLast: 'S',
        fromFirst: 'A',
        fromLast: 'B',
      }),
    ).toEqual({ firstName: 'Alex', lastName: 'S' })

    expect(
      resolveTelegramPairNames({
        contactFirst: null,
        contactLast: null,
        fromFirst: 'Sam',
        fromLast: null,
      }),
    ).toEqual({ firstName: 'Sam', lastName: 'User' })
  })
})

describe('handleTelegramContactPair', () => {
  beforeEach(() => {
    rpc.mockReset()
    maybeSingle.mockReset()
    getLatestOpenPairTokenForUser.mockReset()
    getParticipantIdForTelegramUser.mockReset()
    completeTelegramPair.mockReset()
  })

  it('links an existing participant without calling ensure_soft_participant', async () => {
    getLatestOpenPairTokenForUser.mockResolvedValue(pending)
    getParticipantIdForTelegramUser.mockResolvedValue(null)
    maybeSingle.mockResolvedValue({ data: { id: 'existing-part' }, error: null })
    completeTelegramPair.mockResolvedValue({
      display_name: 'Alex Existing',
      org_id: 'org-1',
    })

    const result = await handleTelegramContactPair({
      telegramUserId: 42,
      telegramUsername: 'alex',
      fromFirstName: 'Alex',
      fromLastName: 'User',
      contact: {
        phone_number: '+12025551234',
        user_id: 42,
        first_name: 'Alex',
        last_name: 'User',
      },
    })

    expect(result.ok).toBe(true)
    expect(result.message).toContain('Alex Existing')
    expect(rpc).not.toHaveBeenCalled()
    expect(completeTelegramPair).toHaveBeenCalledWith('pair-tok', 'existing-part')
  })

  it('creates a soft participant only when the phone is new', async () => {
    getLatestOpenPairTokenForUser.mockResolvedValue(pending)
    getParticipantIdForTelegramUser.mockResolvedValue(null)
    maybeSingle.mockResolvedValue({ data: null, error: null })
    rpc.mockResolvedValue({
      data: { participant_id: 'part-1', session_token: 'sess' },
      error: null,
    })
    completeTelegramPair.mockResolvedValue({
      display_name: 'Alex U.',
      org_id: 'org-1',
    })

    const result = await handleTelegramContactPair({
      telegramUserId: 42,
      telegramUsername: 'alex',
      fromFirstName: 'Alex',
      fromLastName: 'User',
      contact: {
        phone_number: '+12025551234',
        user_id: 42,
        first_name: 'Alex',
        last_name: 'User',
      },
    })

    expect(result.ok).toBe(true)
    expect(result.message).toContain('linked as Alex U.')
    expect(rpc).toHaveBeenCalledWith(
      'ensure_soft_participant',
      expect.objectContaining({
        p_org_id: 'org-1',
        p_phone: '12025551234',
        p_first_name: 'Alex',
        p_last_name: 'User',
      }),
    )
    expect(completeTelegramPair).toHaveBeenCalledWith('pair-tok', 'part-1')
  })

  it('rejects wrong-user contacts before touching RPCs', async () => {
    const result = await handleTelegramContactPair({
      telegramUserId: 42,
      telegramUsername: null,
      contact: { phone_number: '+12025551234', user_id: 99 },
    })
    expect(result.ok).toBe(false)
    expect(getLatestOpenPairTokenForUser).not.toHaveBeenCalled()
  })

  it('fails closed when there is no open pair token', async () => {
    getLatestOpenPairTokenForUser.mockResolvedValue(null)
    const result = await handleTelegramContactPair({
      telegramUserId: 42,
      telegramUsername: null,
      contact: { phone_number: '+12025551234', user_id: 42 },
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Send \/link/)
  })
})
