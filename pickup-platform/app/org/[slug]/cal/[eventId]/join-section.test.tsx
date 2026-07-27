import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JoinSection } from './join-section'
import { clearParticipantSession, recoverSession } from './actions'
import { clearParticipantDeviceSession } from '@/lib/participant-session-client'

const refreshMock = vi.fn()
const reopenJoinPanelMock = vi.fn()
const runSignupCelebrationMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: refreshMock,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('./actions', () => ({
  joinEvent: vi.fn(),
  quickJoinEvent: vi.fn(),
  recoverSession: vi.fn(),
  clearParticipantSession: vi.fn(),
}))

vi.mock('@/lib/participant-session-client', () => ({
  clearParticipantDeviceSession: vi.fn(),
}))

vi.mock('../../_components/save-participant-account-card', () => ({
  SaveParticipantAccountCard: () => <div data-testid="save-account-card" />,
}))

vi.mock('./paid-join-sheet', () => ({
  PaidJoinSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="paid-join-sheet">Paid join sheet</div> : null,
}))

vi.mock('./participation-motion', () => ({
  useParticipationMotion: () => ({
    reopenJoinPanel: reopenJoinPanelMock,
    runSignupCelebration: runSignupCelebrationMock,
  }),
}))

const clearParticipantSessionMock = vi.mocked(clearParticipantSession)
const recoverSessionMock = vi.mocked(recoverSession)
const clearParticipantDeviceSessionMock = vi.mocked(clearParticipantDeviceSession)

const participant = {
  first_name: 'Jeff',
  last_name: 'Pickup',
  display_name: 'Jeff P.',
  phone: '12025550101',
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
      eventWhen="Tue Jul 7"
      locationLabel="Main Field"
      locationMapsUrl={null}
      returningSignupModalEnabled={false}
      {...overrides}
    />,
  )
}

describe('JoinSection "Not you?" flow', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    reopenJoinPanelMock.mockReset()
    clearParticipantSessionMock.mockReset()
    recoverSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockResolvedValue({ ok: true })
    clearParticipantSessionMock.mockResolvedValue({})
    localStorage.clear()
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
    expect(screen.getByRole('button', { name: /not you\?/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /save your spot/i })).not.toBeInTheDocument()
    // Optional free-path save-account card is intentionally hidden for now.
    expect(screen.queryByTestId('save-account-card')).not.toBeInTheDocument()
  })

  it('routes paid sessions to the pay-to-join path', () => {
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
      isAuthenticated: false,
    })
    expect(screen.getByText(/this session costs \$15\.00/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join · \$15\.00/i })).toBeInTheDocument()
  })

  it('opens the paid join sheet from the continue CTA', async () => {
    const user = userEvent.setup()
    renderJoinSection({
      participant: null,
      paidSession: true,
      priceCents: 1500,
      isAuthenticated: false,
    })

    expect(screen.queryByTestId('paid-join-sheet')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /join · \$15\.00/i }))
    expect(screen.getByTestId('paid-join-sheet')).toBeInTheDocument()
  })

  it('shows welcome-back paid UI for returning participants', () => {
    renderJoinSection({
      paidSession: true,
      priceCents: 1500,
      isAuthenticated: false,
    })

    expect(screen.getByRole('heading', { name: /welcome back, jeff p\./i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join · \$15\.00/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not you\?/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /join this session/i })).not.toBeInTheDocument()
  })

  it('updates the paid join CTA total when guests change', async () => {
    const user = userEvent.setup()
    renderJoinSection({
      paidSession: true,
      priceCents: 500,
      isAuthenticated: false,
    })

    expect(screen.getByRole('button', { name: /join · \$5\.00/i })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), '2')
    expect(screen.getByRole('button', { name: /join · \$15\.00/i })).toBeInTheDocument()
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
    expect(screen.getByTestId('paid-join-sheet')).toBeInTheDocument()
  })

  it('clears the device session and switches to the new-user signup form', async () => {
    const user = userEvent.setup()
    localStorage.setItem('returning-signup-seen:demo:event-1', '1')

    renderJoinSection()

    await user.click(screen.getByRole('button', { name: /not you\?/i }))

    await waitFor(() => {
      expect(clearParticipantDeviceSessionMock).toHaveBeenCalledOnce()
    })
    expect(clearParticipantSessionMock).toHaveBeenCalledWith('demo', 'event-1')
    expect(reopenJoinPanelMock).toHaveBeenCalledOnce()
    expect(refreshMock).toHaveBeenCalledOnce()
    expect(localStorage.getItem('returning-signup-seen:demo:event-1')).toBeNull()
    expect(screen.getByRole('heading', { name: /save your spot/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument()
  })

  it('stays on welcome back and shows an error when device session clear fails', async () => {
    const user = userEvent.setup()
    clearParticipantDeviceSessionMock.mockResolvedValue({
      error: 'Could not clear your session. Please try again.',
    })

    renderJoinSection()

    await user.click(screen.getByRole('button', { name: /not you\?/i }))

    await waitFor(() => {
      expect(screen.getByText(/could not clear your session/i)).toBeInTheDocument()
    })
    expect(clearParticipantSessionMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: /welcome back, jeff p\./i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /save your spot/i })).not.toBeInTheDocument()
  })

  it('clears the device session from the returning-signup modal', async () => {
    const user = userEvent.setup()

    renderJoinSection({ returningSignupModalEnabled: true })

    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    await user.click(screen.getByRole('button', { name: /not you\?/i }))

    await waitFor(() => {
      expect(clearParticipantDeviceSessionMock).toHaveBeenCalledOnce()
    })
    expect(clearParticipantSessionMock).toHaveBeenCalledWith('demo', 'event-1')
    expect(refreshMock).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: /save your spot/i })).toBeInTheDocument()
  }, 10_000)
})

describe('JoinSection recover session', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    reopenJoinPanelMock.mockReset()
    clearParticipantSessionMock.mockReset()
    recoverSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockResolvedValue({ ok: true })
    localStorage.clear()
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

  it('submits the hidden phone digits from PhoneInput', async () => {
    const user = userEvent.setup()
    recoverSessionMock.mockResolvedValue({})

    renderJoinSection({ participant: null })

    await user.click(
      screen.getByRole('button', { name: /already signed up on another device\?/i }),
    )

    const phoneFields = screen.getAllByRole('textbox', { name: /phone number/i })
    await user.type(phoneFields[phoneFields.length - 1]!, '2025550101')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(recoverSessionMock).toHaveBeenCalledOnce()
    })
    expect(recoverSessionMock.mock.calls[0]?.[2]).toBe('12025550101')
  })
})

describe('JoinSection new user signup', () => {
  beforeEach(() => {
    runSignupCelebrationMock.mockReset()
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

  it('validates phone before starting signup celebration', async () => {
    const user = userEvent.setup()

    renderJoinSection({ participant: null })

    await user.type(screen.getByRole('textbox', { name: /first name/i }), 'Jeff')
    await user.type(screen.getByRole('textbox', { name: /last name/i }), 'Pickup')
    await user.type(screen.getByRole('textbox', { name: /phone number/i }), '123')
    await user.click(screen.getByRole('button', { name: /count me in/i }))

    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument()
    expect(runSignupCelebrationMock).not.toHaveBeenCalled()
  })
})
