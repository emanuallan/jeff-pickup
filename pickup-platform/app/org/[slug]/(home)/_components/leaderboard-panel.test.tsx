import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ORG_SETTINGS } from '@/lib/org-features'
import type { Org } from '@/lib/orgs'
import { LeaderboardPanel } from './leaderboard-panel'

vi.mock('./leaderboard-month-chips', () => ({
  LeaderboardMonthChips: ({ activePeriodId }: { activePeriodId: string }) => (
    <div data-testid="month-chips">{activePeriodId}</div>
  ),
}))

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

const chips = [
  {
    id: '2026-07',
    monthLabel: 'Jul',
    yearLabel: '2026',
    ariaLabel: 'July 2026',
  },
  {
    id: 'all',
    monthLabel: 'All',
    yearLabel: 'time',
    ariaLabel: 'All time',
  },
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
        chips={chips}
        activePeriodId="all"
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
        chips={chips}
        activePeriodId="all"
        showStreaks
      />,
    )

    expect(screen.getByRole('heading', { name: 'Session MVPs' })).toBeInTheDocument()
    expect(screen.getByText('Votes won after sessions')).toBeInTheDocument()
    expect(screen.getByText('MVPs')).toBeInTheDocument()
    expect(screen.getByText('MVP')).toBeInTheDocument()
  })

  it('hides streaks for a selected month', () => {
    render(
      <LeaderboardPanel
        org={makeOrg(true)}
        capsRows={capsRows}
        streakRows={streakRows}
        mvpRows={mvpRows}
        chips={chips}
        activePeriodId="2026-07"
        showStreaks={false}
      />,
    )

    expect(screen.getByTestId('month-chips')).toHaveTextContent('2026-07')
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
        chips={chips}
        activePeriodId="all"
        showStreaks
      />,
    )

    expect(screen.getByText(/no session mvps yet/i)).toBeInTheDocument()
  })
})
