import { describe, expect, it } from 'vitest'
import { participantMeInitials, resolveMeStatKeys } from './participant-me'
import { DEFAULT_ORG_FEATURES } from './org-features'

describe('resolveMeStatKeys', () => {
  it('always includes caps and streaks', () => {
    expect(
      resolveMeStatKeys({
        features: DEFAULT_ORG_FEATURES,
        caps: 3,
        totalSessions: 3,
      }),
    ).toEqual(['caps', 'streak', 'best_streak'])
  })

  it('adds sessions when distinct from caps', () => {
    expect(
      resolveMeStatKeys({
        features: DEFAULT_ORG_FEATURES,
        caps: 2,
        totalSessions: 5,
      }),
    ).toEqual(['caps', 'sessions', 'streak', 'best_streak'])
  })

  it('hides goals and assists when session_player_stats is off', () => {
    const keys = resolveMeStatKeys({
      features: { ...DEFAULT_ORG_FEATURES, session_player_stats: false, session_mvp_voting: false },
      caps: 1,
      totalSessions: 1,
    })
    expect(keys).not.toContain('goals')
    expect(keys).not.toContain('assists')
    expect(keys).not.toContain('mvp_awards')
  })

  it('shows goals, assists, and MVP when features are on', () => {
    expect(
      resolveMeStatKeys({
        features: {
          ...DEFAULT_ORG_FEATURES,
          session_player_stats: true,
          session_mvp_voting: true,
        },
        caps: 1,
        totalSessions: 1,
      }),
    ).toEqual(['caps', 'streak', 'best_streak', 'goals', 'assists', 'mvp_awards'])
  })
})

describe('participantMeInitials', () => {
  it('uses first and last initials', () => {
    expect(participantMeInitials('Ada', 'Lovelace', 'Ada L.')).toBe('AL')
  })

  it('falls back to display name', () => {
    expect(participantMeInitials('', '', 'Zed')).toBe('Z')
  })
})
