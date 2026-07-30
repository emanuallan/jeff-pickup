import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeRosterEntry } from '@/test/fixtures/events'
import { RosterList } from './roster-list'

afterEach(() => {
  cleanup()
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('./participation-motion', () => ({
  useParticipationMotion: () => null,
}))

const updateSignupTeam = vi.fn(
  async (_orgSlug: string, _eventId: string, _signupId: string, _team: unknown) => ({}),
)

vi.mock('./actions', () => ({
  leaveEvent: vi.fn(),
  updateArrivalStatus: vi.fn(),
  updateGuestCount: vi.fn(),
  updateSignupTeam: (
    orgSlug: string,
    eventId: string,
    signupId: string,
    team: unknown,
  ) => updateSignupTeam(orgSlug, eventId, signupId, team),
}))

describe('team selection UI', () => {
  it('renders N team columns and Unassigned when needed', () => {
    render(
      <RosterList
        entries={[
          makeRosterEntry({ id: 'a', display_name: 'Ada', team: 1 }),
          makeRosterEntry({ id: 'b', display_name: 'Bea', team: 3 }),
          makeRosterEntry({ id: 'c', display_name: 'Cara', team: null }),
        ]}
        teamSelection
        teamCount={3}
      />,
    )

    expect(screen.getByText('Team 1')).toBeInTheDocument()
    expect(screen.getByText('Team 2')).toBeInTheDocument()
    expect(screen.getByText('Team 3')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
    expect(screen.getByText('Cara')).toBeInTheDocument()
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('hides Unassigned when everyone is assigned', () => {
    render(
      <RosterList
        entries={[
          makeRosterEntry({ id: 'a', display_name: 'Ada', team: 1 }),
          makeRosterEntry({ id: 'b', display_name: 'Bea', team: 2 }),
        ]}
        teamSelection
        teamCount={2}
      />,
    )

    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
  })

  it('offers Join on every team except the one you are already on', () => {
    render(
      <RosterList
        entries={[makeRosterEntry({ id: 'a', display_name: 'Ada', team: 2 })]}
        mySignupId="a"
        canPickTeam
        orgSlug="demo"
        eventId="evt"
        teamSelection
        teamCount={3}
      />,
    )

    expect(screen.getByRole('button', { name: 'Join Team 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join Team 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join Team 3' })).toBeInTheDocument()
  })

  it('switches you to the team whose column you clicked', async () => {
    const user = userEvent.setup()
    updateSignupTeam.mockClear()

    render(
      <RosterList
        entries={[makeRosterEntry({ id: 'a', display_name: 'Ada', team: 1 })]}
        mySignupId="a"
        canPickTeam
        orgSlug="demo"
        eventId="evt"
        teamSelection
        teamCount={2}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Join Team 2' }))
    expect(updateSignupTeam).toHaveBeenCalledWith('demo', 'evt', 'a', 2)
  })

  it('hides Join for onlookers who cannot pick a team', () => {
    render(
      <RosterList
        entries={[makeRosterEntry({ id: 'a', display_name: 'Ada', team: 1 })]}
        orgSlug="demo"
        eventId="evt"
        teamSelection
        teamCount={2}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Join Team 2' })).not.toBeInTheDocument()
  })
})
