import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JoinSection } from './join-section'
import { clearParticipantSession, joinEventWithSession } from './actions'
import { clearParticipantDeviceSession } from '@/lib/participant-session-client'

const refreshMock = vi.fn()
const reloadMock = vi.fn()
const replaceMock = vi.fn()
const reopenJoinPanelMock = vi.fn()
const runSignupCelebrationMock = vi.fn()
const useSearchParamsMock = vi.fn(() => new URLSearchParams())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    refresh: refreshMock,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('./actions', () => ({
  joinEvent: vi.fn(),
  joinEventWithSession: vi.fn(),
  quickJoinEvent: vi.fn(),
  recoverSession: vi.fn(),
  clearParticipantSession: vi.fn(),
}))

vi.mock('@/lib/participant-session-client', () => ({
  clearParticipantDeviceSession: vi.fn(),
  saveParticipantProfile: vi.fn(),
}))

vi.mock('./paid-join-sheet', () => ({
  PaidJoinSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="paid-join-sheet">Paid join sheet</div> : null,
}))

vi.mock('./participant-email-claim-sheet', () => ({
  ParticipantEmailClaimSheet: ({
    open,
    mode,
  }: {
    open: boolean
    mode?: string
  }) => (open ? <div data-testid="email-claim-sheet">Email claim ({mode})</div> : null),
}))

vi.mock('./participation-motion', () => ({
  useParticipationMotion: () => ({
    reopenJoinPanel: reopenJoinPanelMock,
    runSignupCelebration: runSignupCelebrationMock,
  }),
}))

const clearParticipantSessionMock = vi.mocked(clearParticipantSession)
const clearParticipantDeviceSessionMock = vi.mocked(clearParticipantDeviceSession)
const joinEventWithSessionMock = vi.mocked(joinEventWithSession)

const participant = {
  participant_id: 'part-1',
  first_name: 'Jeff',
  last_name: 'Pickup',
  display_name: 'Jeff P.',
  phone: '12025550101',
  email: 'jeff@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
}

function renderJoinSection(overrides: Partial<ComponentProps<typeof JoinSection>> = {}) {
  return render(
    <JoinSection
      orgSlug="demo"
      orgId="org-1"
      eventId="event-1"
      accent="#2563eb"
      accentText="#ffffff"
      isFull={false}
      waitlistEnabled={false}
      isOnline={false}
      spotsLeft={10}
      participant={participant}
      mySignup={null}
      eventTitle="Tuesday Pickup"
      eventWhen="Tue 6pm"
      locationLabel="Park"
      locationMapsUrl={null}
      returningSignupModalEnabled={false}
      guestsEnabled
      {...overrides}
    />,
  )
}

describe('JoinSection', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    reloadMock.mockReset()
    replaceMock.mockReset()
    reopenJoinPanelMock.mockReset()
    runSignupCelebrationMock.mockReset()
    runSignupCelebrationMock.mockImplementation(async (fn: () => Promise<unknown>) => fn())
    clearParticipantSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockResolvedValue({ ok: true })
    clearParticipantSessionMock.mockResolvedValue({})
    joinEventWithSessionMock.mockReset()
    joinEventWithSessionMock.mockResolvedValue({})
    useSearchParamsMock.mockReset()
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
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

  it('shows the welcome-back UI for a returning participant', () => {
    renderJoinSection()

    expect(screen.getByRole('heading', { name: /welcome back, jeff p\./i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /save your spot/i })).not.toBeInTheDocument()
  })

  it('routes unpaid new users to email claim CTA', () => {
    renderJoinSection({ participant: null })
    expect(screen.getByRole('heading', { name: /save your spot/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /count me in/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /already previously signed up\?/i }),
    ).toBeInTheDocument()
  })

  it('opens the email claim sheet for new free joiners after names are entered', async () => {
    const user = userEvent.setup()
    renderJoinSection({ participant: null })

    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await user.click(screen.getByRole('button', { name: /count me in/i }))
    expect(screen.getByTestId('email-claim-sheet')).toHaveTextContent(/claim/i)
  })

  it('requires names before opening the claim sheet', async () => {
    const user = userEvent.setup()
    renderJoinSection({ participant: null })

    await user.click(screen.getByRole('button', { name: /count me in/i }))
    expect(screen.queryByTestId('email-claim-sheet')).not.toBeInTheDocument()
    expect(screen.getByText(/enter your first and last name/i)).toBeInTheDocument()
  })

  it('opens recover claim sheet from sign-in link without requiring names', async () => {
    const user = userEvent.setup()
    renderJoinSection({ participant: null })

    await user.click(screen.getByRole('button', { name: /already previously signed up\?/i }))
    expect(screen.getByTestId('email-claim-sheet')).toHaveTextContent(/recover/i)
  })

  it('routes paid sessions to email verify then pay', () => {
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
    })
    expect(screen.getByRole('heading', { name: /save your spot/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue · \$15\.00/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  })

  it('opens claim sheet from paid continue CTA after names are entered', async () => {
    const user = userEvent.setup()
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
    })

    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await user.click(screen.getByRole('button', { name: /continue · \$15\.00/i }))
    expect(screen.getByTestId('email-claim-sheet')).toBeInTheDocument()
    expect(screen.queryByTestId('paid-join-sheet')).not.toBeInTheDocument()
  })

  it('does not offer a waitlist when a paid session is full', () => {
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
      isFull: true,
      waitlistEnabled: false,
    })

    expect(screen.getByRole('heading', { name: /this session is full/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue|join waitlist/i })).not.toBeInTheDocument()
  })

  it('shows a one-shot payment-cancelled banner and strips paid from the URL', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('cal=event-1&paid=0'))

    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
    })

    expect(
      screen.getByText(/payment was not completed\. you can try again when you’re ready\./i),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/?cal=event-1', { scroll: false })
    })
  })

  it('shows welcome-back paid UI for verified returning participants', () => {
    renderJoinSection({
      paidSession: true,
      priceCents: 1500,
    })

    expect(screen.getByRole('heading', { name: /welcome back, jeff p\./i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join · \$15\.00/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /save your spot/i })).not.toBeInTheDocument()
  })

  it('updates the paid join CTA total when guests change', async () => {
    const user = userEvent.setup()
    renderJoinSection({
      paidSession: true,
      priceCents: 500,
    })

    expect(screen.getByRole('button', { name: /join · \$5\.00/i })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), '2')
    expect(screen.getByRole('button', { name: /join · \$15\.00/i })).toBeInTheDocument()
  })

  it('updates the new-user continue CTA total when guests change', async () => {
    const user = userEvent.setup()
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 500,
    })

    expect(screen.getByRole('button', { name: /continue · \$5\.00/i })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/guests you're bringing/i), '2')
    expect(screen.getByRole('button', { name: /continue · \$15\.00/i })).toBeInTheDocument()
  })

  it('switches to paid join UI when soft join returns payment_required', async () => {
    const user = userEvent.setup()
    runSignupCelebrationMock.mockResolvedValue({
      error: 'This session requires payment.',
      code: 'payment_required',
      priceCents: 2000,
    })

    renderJoinSection()

    await user.click(screen.getByRole('button', { name: /count me in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /join · \$20\.00/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: /welcome back, jeff p\./i })).toBeInTheDocument()
  })

  it('prompts unverified returning users to verify email', () => {
    renderJoinSection({
      participant: {
        ...participant,
        email_verified_at: null,
      },
    })

    expect(screen.getByText(/add a verified email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument()
  })
})
