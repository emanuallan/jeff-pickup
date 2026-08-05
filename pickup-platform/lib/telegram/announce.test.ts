import { describe, expect, it, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
const rpcMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}))

vi.mock('@/lib/telegram/config', () => ({
  getTelegramBotToken: () => 'test-token',
}))

vi.mock('@/lib/telegram/links', () => ({
  getTelegramOrgLinkByOrgId: vi.fn(),
}))

vi.mock('@/lib/site-url', () => ({
  orgBaseUrl: (slug: string) => `https://${slug}.organizr.co`,
}))

import { getTelegramOrgLinkByOrgId } from '@/lib/telegram/links'
import {
  announcePendingTelegramMvps,
  announceSessionMvpToTelegram,
  hourInTimeZone,
  isWithinTelegramMvpAnnounceHours,
  suppressHistoricalTelegramMvpAnnouncements,
  TELEGRAM_MVP_ANNOUNCE_LOOKBACK_HOURS,
} from '@/lib/telegram/announce'

const getLinkMock = vi.mocked(getTelegramOrgLinkByOrgId)

describe('telegram MVP announce hours', () => {
  it('defaults lookback to 24 hours', () => {
    expect(TELEGRAM_MVP_ANNOUNCE_LOOKBACK_HOURS).toBe(24)
  })

  it('allows daytime local hours and blocks overnight', () => {
    // 2026-08-05 16:00 UTC = 12:00 America/New_York (EDT)
    const noonEt = new Date('2026-08-05T16:00:00.000Z')
    expect(hourInTimeZone(noonEt, 'America/New_York')).toBe(12)
    expect(isWithinTelegramMvpAnnounceHours(noonEt, 'America/New_York')).toBe(true)

    // 2026-08-05 06:00 UTC = 02:00 America/New_York (EDT)
    const twoAmEt = new Date('2026-08-05T06:00:00.000Z')
    expect(hourInTimeZone(twoAmEt, 'America/New_York')).toBe(2)
    expect(isWithinTelegramMvpAnnounceHours(twoAmEt, 'America/New_York')).toBe(false)
  })
})

describe('suppressHistoricalTelegramMvpAnnouncements', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('marks unannounced finalizations for the org', async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ event_id: 'e1' }, { event_id: 'e2' }],
      error: null,
    })
    const is = vi.fn().mockReturnValue({ select })
    const eq = vi.fn().mockReturnValue({ is })
    const update = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ update })

    const count = await suppressHistoricalTelegramMvpAnnouncements('org-1')
    expect(count).toBe(2)
    expect(fromMock).toHaveBeenCalledWith('session_mvp_finalizations')
    expect(eq).toHaveBeenCalledWith('org_id', 'org-1')
  })
})

describe('announceSessionMvpToTelegram', () => {
  beforeEach(() => {
    fromMock.mockReset()
    getLinkMock.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true }),
    )
  })

  it('skips and suppresses finalizations older than the bot link', async () => {
    const updateIs = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateEq = vi.fn().mockReturnValue({ is: updateIs })
    const update = vi.fn().mockReturnValue({ eq: updateEq })

    fromMock.mockImplementation((table: string) => {
      if (table === 'session_mvp_finalizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  event_id: 'e1',
                  org_id: 'org-1',
                  telegram_announced_at: null,
                  finalized_at: '2026-08-03T12:00:00.000Z',
                },
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return { select: vi.fn() }
    })

    getLinkMock.mockResolvedValue({
      org_id: 'org-1',
      telegram_chat_id: 1,
      chat_title: 'Group',
      linked_at: '2026-08-04T12:00:00.000Z',
      announce_sessions: true,
      announce_mvp: true,
    })

    const ok = await announceSessionMvpToTelegram('e1')
    expect(ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
  })

  it('does not send during quiet hours and leaves announced_at null', async () => {
    vi.setSystemTime(new Date('2026-08-05T06:30:00.000Z')) // 2:30am ET

    fromMock.mockImplementation((table: string) => {
      if (table === 'session_mvp_finalizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  event_id: 'e1',
                  org_id: 'org-1',
                  telegram_announced_at: null,
                  finalized_at: '2026-08-05T13:00:00.000Z',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn(),
        }
      }
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'e1',
                  org_id: 'org-1',
                  short_id: 'abc',
                  title: 'Tuesday pickup',
                  starts_at: '2026-08-04T23:00:00.000Z',
                  timezone: 'America/New_York',
                  duration_min: 90,
                  schedules: { title: 'Tuesday pickup' },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    getLinkMock.mockResolvedValue({
      org_id: 'org-1',
      telegram_chat_id: 1,
      chat_title: 'Group',
      linked_at: '2026-08-01T12:00:00.000Z',
      announce_sessions: true,
      announce_mvp: true,
    })

    const ok = await announceSessionMvpToTelegram('e1')
    expect(ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('announcePendingTelegramMvps', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('queries a 24h finalized_at lookback by default', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null })
    const gte = vi.fn().mockReturnValue({ limit })
    const is = vi.fn().mockReturnValue({ gte })
    const select = vi.fn().mockReturnValue({ is })
    fromMock.mockReturnValue({ select })

    await announcePendingTelegramMvps()
    expect(gte).toHaveBeenCalled()
    const sinceArg = gte.mock.calls[0]?.[1] as string
    const sinceMs = Date.now() - new Date(sinceArg).getTime()
    expect(sinceMs).toBeGreaterThan(23 * 60 * 60 * 1000)
    expect(sinceMs).toBeLessThan(25 * 60 * 60 * 1000)
  })
})
