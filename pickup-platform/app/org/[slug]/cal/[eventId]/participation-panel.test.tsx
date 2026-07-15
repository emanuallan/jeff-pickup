import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { makeRosterEntry } from '@/test/fixtures/events'
import type { LiveSessionPayload } from '@/lib/live-session-poll'
import { ParticipationPanel } from './participation-panel'

const reopenJoinPanelMock = vi.fn()
let liveSessionListener: ((payload: LiveSessionPayload) => void) | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/lib/live-session-poll', () => ({
  subscribeLiveSessionPoll: (
    _orgSlug: string,
    _eventRef: string,
    listener: (payload: LiveSessionPayload) => void,
  ) => {
    liveSessionListener = listener
    return () => {
      if (liveSessionListener === listener) {
        liveSessionListener = null
      }
    }
  },
}))

const motionState = {
  kickActive: false,
  kickGuestCount: 0,
  leaveActive: false,
  leaveGuestCount: 0,
  celebrationPlacement: null as 'modal' | 'sheet' | null,
  celebrationAccent: '#2563eb',
  joinClosing: false,
  controlsClosing: false,
  pendingRosterScroll: false,
  pendingJoinScroll: false,
  clearPendingRosterScroll: vi.fn(),
  clearPendingJoinScroll: vi.fn(),
  runSignupCelebration: vi.fn(),
  runLeaveCelebration: vi.fn(),
  dismissJoinPanel: vi.fn(),
  reopenJoinPanel: reopenJoinPanelMock,
  dismissSignedInControls: vi.fn(),
  reopenSignedInControls: vi.fn(),
}

vi.mock('./participation-motion', () => ({
  ParticipationMotionProvider: ({ children }: { children: React.ReactNode }) => children,
  useParticipationMotion: () => motionState,
}))

vi.mock('./join-section-lazy', () => ({
  JoinSectionLazy: () => <div data-testid="join-section" />,
}))

vi.mock('./roster-list-lazy', () => ({
  RosterListLazy: ({
    entries,
  }: {
    entries: Array<{ id: string; display_name: string }>
  }) => (
    <ul data-testid="roster-list">
      {entries.map((entry) => (
        <li key={entry.id}>{entry.display_name}</li>
      ))}
    </ul>
  ),
}))

vi.mock('./waitlist-section', () => ({
  WaitlistSection: () => null,
}))

vi.mock('./signed-in-guest-section', () => ({
  SignedInGuestSection: () => null,
}))

vi.mock('./signed-in-status-sheet', () => ({
  SignedInStatusSheet: () => null,
}))

const participant = {
  first_name: 'Jeff',
  last_name: 'Pickup',
  display_name: 'Jeff P.',
  phone: '12025550101',
}

const mySignup = {
  signup_id: 'signup-1',
  guest_count: 0,
  arrival_status: 'confirmed' as const,
  display_name: 'Jeff P.',
  list_status: 'confirmed' as const,
}

const basePanelProps: ComponentProps<typeof ParticipationPanel> = {
  orgSlug: 'demo',
  orgId: 'org-1',
  eventId: 'event-1',
  accent: '#2563eb',
  accentText: '#ffffff',
  isFull: false,
  waitlistEnabled: false,
  isOnline: false,
  spotsLeft: 10,
  capacity: 20,
  participant,
  mySignup: null,
  eventTitle: 'Tuesday Pickup',
  eventWhen: 'Tue Jul 7',
  locationLabel: 'Main Field',
  locationMapsUrl: null,
  returningSignupModalEnabled: false,
  roster: [],
  waitlist: [],
  headcount: 0,
  isEnded: false,
  confirmedMySignupId: null,
  waitlistMySignupId: null,
  canUpdateStatus: true,
  badgesByParticipantId: {},
  rosterHeading: "Who's coming",
  publicRosterEnabled: false,
}

function renderPanel(overrides: Partial<ComponentProps<typeof ParticipationPanel>> = {}) {
  return render(<ParticipationPanel {...basePanelProps} {...overrides} />)
}

describe('ParticipationPanel signup confirmation', () => {
  beforeEach(() => {
    motionState.joinClosing = false
    motionState.controlsClosing = false
    reopenJoinPanelMock.mockReset()
    liveSessionListener = null
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the thanks banner when the user has signed up', () => {
    renderPanel({ mySignup, confirmedMySignupId: mySignup.signup_id })

    expect(
      screen.getByRole('heading', { name: /thanks for signing up, jeff!/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('join-section')).not.toBeInTheDocument()
  })

  it('keeps the thanks banner visible while the join panel is closing after signup', () => {
    const { rerender } = renderPanel({ mySignup, confirmedMySignupId: mySignup.signup_id })

    expect(
      screen.getByRole('heading', { name: /thanks for signing up, jeff!/i }),
    ).toBeInTheDocument()

    motionState.joinClosing = true
    rerender(
      <ParticipationPanel
        {...basePanelProps}
        mySignup={mySignup}
        confirmedMySignupId={mySignup.signup_id}
        headcount={1}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /thanks for signing up, jeff!/i }),
    ).toBeInTheDocument()
    expect(reopenJoinPanelMock).toHaveBeenCalled()
  })

  it('updates the roster list from the shared live session poll', () => {
    renderPanel({
      publicRosterEnabled: true,
      roster: [makeRosterEntry({ id: 's1', display_name: 'Alex' })],
      headcount: 1,
    })

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(liveSessionListener).toBeTypeOf('function')

    act(() => {
      liveSessionListener?.({
        headcount: 2,
        roster: [
          makeRosterEntry({ id: 's1', display_name: 'Alex' }),
          makeRosterEntry({ id: 's2', display_name: 'Sam' }),
        ],
        waitlist: [],
      })
    })

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })
})
