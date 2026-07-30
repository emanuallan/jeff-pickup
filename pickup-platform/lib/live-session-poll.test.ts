import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeRosterEntry } from '@/test/fixtures/events'
import {
  parseLiveSessionPayload,
  resetLiveSessionPollForTests,
  subscribeLiveSessionPoll,
} from './live-session-poll'

describe('live-session-poll', () => {
  afterEach(() => {
    resetLiveSessionPollForTests()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('parses a headcount + roster + waitlist payload', () => {
    const roster = [makeRosterEntry({ id: 's1', display_name: 'Alex' })]
    const waitlist = [
      makeRosterEntry({
        id: 's2',
        display_name: 'Sam',
        list_status: 'waitlisted',
      }),
    ]

    expect(
      parseLiveSessionPayload({
        headcount: 2,
        status: 'on',
        roster,
        waitlist,
      }),
    ).toEqual({
      headcount: 2,
      status: 'on',
      roster: [{ ...roster[0], list_status: 'confirmed', team: null }],
      waitlist: [{ ...waitlist[0], list_status: 'waitlisted', team: null }],
    })
  })

  it('keeps team assignments so polling does not reset players to unassigned', () => {
    const payload = parseLiveSessionPayload({
      headcount: 2,
      roster: [
        makeRosterEntry({ id: 's1', display_name: 'Alex', team: 2 }),
        makeRosterEntry({ id: 's2', display_name: 'Sam', team: null }),
      ],
      waitlist: [],
    })

    expect(payload?.roster[0]?.team).toBe(2)
    expect(payload?.roster[1]?.team).toBeNull()
  })

  it('rejects payloads without a numeric headcount', () => {
    expect(parseLiveSessionPayload({ roster: [] })).toBeNull()
  })

  it('shares one fetch across multiple subscribers', async () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        headcount: 3,
        roster: [makeRosterEntry({ id: 's1', display_name: 'Alex' })],
        waitlist: [],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const a = vi.fn()
    const b = vi.fn()
    const unsubA = subscribeLiveSessionPoll('demo', 'evt-1', a)
    const unsubB = subscribeLiveSessionPoll('demo', 'evt-1', b)

    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/org/demo/cal/evt-1/headcount')
    expect(a).toHaveBeenCalledWith(
      expect.objectContaining({
        headcount: 3,
        roster: [expect.objectContaining({ display_name: 'Alex' })],
      }),
    )
    expect(b).toHaveBeenCalledWith(
      expect.objectContaining({
        headcount: 3,
      }),
    )

    unsubA()
    unsubB()
  })
})
