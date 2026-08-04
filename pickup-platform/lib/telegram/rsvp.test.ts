import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getNextUpcomingEventForOrg, parseTelegramTeamArg } from '@/lib/telegram/rsvp'

const fromMock = vi.fn()

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({ from: fromMock }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}))

describe('parseTelegramTeamArg', () => {
  it('parses team numbers and rejects junk', () => {
    expect(parseTelegramTeamArg(undefined)).toBeNull()
    expect(parseTelegramTeamArg('')).toBeNull()
    expect(parseTelegramTeamArg('abc')).toBeNull()
    expect(parseTelegramTeamArg('2')).toBe(2)
    expect(parseTelegramTeamArg(' 3 extra')).toBe(3)
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
