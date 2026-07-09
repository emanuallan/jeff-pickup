import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ParticipationPanel } from './participation-panel'

const reopenJoinPanelMock = vi.fn()

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
  RosterListLazy: () => <ul data-testid="roster-list" />,
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
})
