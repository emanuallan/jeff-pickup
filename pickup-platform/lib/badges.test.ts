import { describe, expect, it } from 'vitest'
import { buildRosterBadgeMap, rosterBadges } from './badges'

describe('badges', () => {
  it('includes session MVP badge metadata when provided', () => {
    const badges = rosterBadges({
      stats: {
        participant_id: 'p1',
        caps: 5,
        total_sessions: 5,
        current_streak_weeks: 0,
        best_streak_weeks: 0,
      },
      topCapsOnRoster: 5,
      isSessionMvp: true,
      sessionMvpEventLabel: 'Tuesday pickup',
    })

    expect(badges.isSessionMvp).toBe(true)
    expect(badges.sessionMvpEventLabel).toBe('Tuesday pickup')
  })

  it('maps session MVP badges onto roster participants', () => {
    const map = buildRosterBadgeMap(
      [{ participant_id: 'p1' }, { participant_id: 'p2' }],
      new Map(),
      {
        sessionMvpBadges: new Map([['p2', { event_label: 'Saturday run' }]]),
      },
    )

    expect(map.p1?.isSessionMvp).toBe(false)
    expect(map.p2?.isSessionMvp).toBe(true)
    expect(map.p2?.sessionMvpEventLabel).toBe('Saturday run')
  })
})
