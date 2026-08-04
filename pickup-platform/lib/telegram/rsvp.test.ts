import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getNextUpcomingEventForOrg,
  handleTelegramStartLinkIntent,
  parseTelegramTeamArg,
} from '@/lib/telegram/rsvp'

const fromMock = vi.fn()
const redeemLinkIntent = vi.fn()

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({ from: fromMock }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}))

vi.mock('@/lib/telegram/links', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/telegram/links')>()
  return {
    ...actual,
    redeemLinkIntent: (...args: unknown[]) => redeemLinkIntent(...args),
  }
})

describe('parseTelegramTeamArg', () => {
  it('parses team numbers and rejects junk', () => {
    expect(parseTelegramTeamArg(undefined)).toBeNull()
    expect(parseTelegramTeamArg('')).toBeNull()
    expect(parseTelegramTeamArg('abc')).toBeNull()
    expect(parseTelegramTeamArg('2')).toBe(2)
    expect(parseTelegramTeamArg(' 3 extra')).toBe(3)
  })
})

describe('handleTelegramStartLinkIntent', () => {
  beforeEach(() => {
    redeemLinkIntent.mockReset()
  })

  it('returns null for non-intent payloads', async () => {
    await expect(handleTelegramStartLinkIntent('link', 1)).resolves.toBeNull()
    await expect(handleTelegramStartLinkIntent('p_abc', 1)).resolves.toBeNull()
  })

  it('delivers the pairing URL after a successful redeem', async () => {
    redeemLinkIntent.mockResolvedValue({
      org_id: 'org-1',
      org_slug: 'jeff',
      org_name: 'Jeff',
      pair_token: 'pair-secret',
      telegram_user_id: 42,
    })

    const result = await handleTelegramStartLinkIntent('i_A1B2C3D4', 42)
    expect(result?.ok).toBe(true)
    expect(result?.pairUrl).toContain('/telegram/pair?token=pair-secret')
    expect(result?.message).toContain("You're all set to pair")
    expect(redeemLinkIntent).toHaveBeenCalledWith('A1B2C3D4', 42)
  })

  it('fails closed when the intent is missing', async () => {
    redeemLinkIntent.mockResolvedValue(null)
    const result = await handleTelegramStartLinkIntent('i_GONE', 42)
    expect(result?.ok).toBe(false)
    expect(result?.message).toMatch(/expired or was already used/i)
  })

  it('fails closed when redeem rejects wrong user / expiry', async () => {
    redeemLinkIntent.mockRejectedValue(
      new Error('That start link belongs to a different Telegram account'),
    )
    const result = await handleTelegramStartLinkIntent('i_A1B2C3D4', 99)
    expect(result?.ok).toBe(false)
    expect(result?.message).toMatch(/different Telegram account/)
  })
})

describe('getNextUpcomingEventForOrg', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('returns the soonest non-ended event', async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'e1',
            short_id: 'abc12345',
            org_id: 'o1',
            schedule_id: null,
            location_id: 'l1',
            starts_at: startsAt,
            timezone: 'America/New_York',
            duration_min: 90,
            capacity: null,
            min_players: null,
            status: 'on',
            announcement: '',
            additional_information: '',
            price_cents: null,
            team_count: null,
            title: 'Tuesday pickup',
            locations: {
              label: 'Field',
              address: '',
              lat: 0,
              lon: 0,
              maps_url: '',
              is_online: false,
              meeting_url: '',
            },
            schedules: null,
          },
        ],
        error: null,
      }),
    }
    fromMock.mockReturnValue(chain)

    const event = await getNextUpcomingEventForOrg('o1')
    expect(event?.short_id).toBe('abc12345')
    expect(event?.title).toBe('Tuesday pickup')
    expect(fromMock).toHaveBeenCalledWith('events')
  })

  it('returns null when the query errors', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'boom' },
      }),
    }
    fromMock.mockReturnValue(chain)

    await expect(getNextUpcomingEventForOrg('o1')).resolves.toBeNull()
  })
})
