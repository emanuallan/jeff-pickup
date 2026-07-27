import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ORG_SETTINGS } from '@/lib/org-features'
import type { Org } from '@/lib/orgs'
import { LeaderboardPanel } from './leaderboard-panel'

function makeOrg(mvpVoting: boolean): Org {
  return {
    id: 'org-1',
    slug: 'jeff',
    name: 'Jeff Soccer',
    description: '',
    status: 'active',
    default_locale: 'en',
    branding: {
      logo_url: null,
      accent_color: '#2563eb',
      links: [],
    },
    settings: {
      ...DEFAULT_ORG_SETTINGS,
      features: {
        ...DEFAULT_ORG_SETTINGS.features,
        session_mvp_voting: mvpVoting,
      },
    },
  }
}

const capsRows = [
  { participant_id: 'p1', display_name: 'Alex', caps: 8 },
  { participant_id: 'p2', display_name: 'Sam', caps: 5 },
]

const streakRows = [
  {
    participant_id: 'p1',
    display_name: 'Alex',
    current_streak_weeks: 3,
    best_streak_weeks: 4,
  },
]

const mvpRows = [
  { participant_id: 'p2', display_name: 'Sam', mvp_count: 3 },
  { participant_id: 'p1', display_name: 'Alex', mvp_count: 1 },
]

describe('LeaderboardPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('hides the MVP board when session MVP voting is off', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(false)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={mvpRows}
        showStreaks
      />,
    )

    expect(screen.getByRole('heading', { name: 'Caps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Weekly streaks' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Session MVPs' })).not.toBeInTheDocument()
  })

  it('shows MVP counts when session MVP voting is on', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={mvpRows}
        showStreaks
      />,
    )

    expect(screen.getByRole('heading', { name: 'Session MVPs' })).toBeInTheDocument()
    expect(screen.getByText('Votes won after sessions')).toBeInTheDocument()
    expect(screen.getByText('MVPs')).toBeInTheDocument()
    expect(screen.getByText('MVP')).toBeInTheDocument()
  })

  it('orders boards as MVP, caps, then streaks', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={mvpRows}
        showStreaks
      />,
    )

    const headings = screen.getAllByRole('heading').map((el) => el.textContent)
    expect(headings).toEqual(['Session MVPs', 'Caps', 'Weekly streaks'])
  })

  it('labels month-scoped boards as that month only', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={[]}
        mvpRows={mvpRows}
        showStreaks={false}
        monthScoped
      />,
    )

    expect(screen.getByText('Attended this month')).toBeInTheDocument()
    expect(screen.getByText('MVP awards this month only')).toBeInTheDocument()
    expect(screen.getByText('Sessions attended this month only')).toBeInTheDocument()
  })

  it('hides streaks for a selected month', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={mvpRows}
        showStreaks={false}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Caps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Session MVPs' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Weekly streaks' })).not.toBeInTheDocument()
  })

  it('shows an empty MVP state when voting is on but nobody has awards', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={[]}
        showStreaks
      />,
    )

    expect(screen.getByText(/no session mvps yet/i)).toBeInTheDocument()
  })
})
