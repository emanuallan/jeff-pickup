import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JoinSection } from './join-section'
import { clearParticipantSession, recoverSession } from './actions'
import { clearParticipantDeviceSession } from '@/lib/participant-session-client'

const reloadMock = vi.fn()
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

vi.mock('./actions', () => ({
  joinEvent: vi.fn(),
  quickJoinEvent: vi.fn(),
  recoverSession: vi.fn(),
  clearParticipantSession: vi.fn(),
}))

vi.mock('@/lib/participant-session-client', () => ({
  clearParticipantDeviceSession: vi.fn(),
}))

vi.mock('./participation-motion', () => ({
  useParticipationMotion: () => ({
    reopenJoinPanel: reopenJoinPanelMock,
    runSignupCelebration: vi.fn(),
  }),
}))

const clearParticipantSessionMock = vi.mocked(clearParticipantSession)
const clearParticipantDeviceSessionMock = vi.mocked(clearParticipantDeviceSession)
const recoverSessionMock = vi.mocked(recoverSession)

const participant = {
  first_name: 'Jeff',
  last_name: 'Pickup',
  display_name: 'Jeff P.',
  phone: '5551234567',
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
    reloadMock.mockReset()
    reopenJoinPanelMock.mockReset()
    clearParticipantSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockReset()
    clearParticipantDeviceSessionMock.mockResolvedValue({ ok: true })
    clearParticipantSessionMock.mockResolvedValue({})
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
    expect(screen.getByRole('button', { name: /not you\?/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /save your spot/i })).not.toBeInTheDocument()
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
    expect(reloadMock).toHaveBeenCalledOnce()
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
    expect(reloadMock).not.toHaveBeenCalled()
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
    expect(reloadMock).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: /save your spot/i })).toBeInTheDocument()
  }, 10_000)
})

describe('JoinSection recover session flow', () => {
  beforeEach(() => {
    reloadMock.mockReset()
    recoverSessionMock.mockReset()
    recoverSessionMock.mockResolvedValue({})
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

  it('reloads the page after recovering a session by phone', async () => {
    const user = userEvent.setup()

    renderJoinSection({ participant: null })

    await user.click(
      screen.getByRole('button', { name: /already signed up on another device/i }),
    )
    const recoverPhone = screen.getAllByLabelText(/phone number/i)[1]!
    await user.type(recoverPhone, '5551234567')
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() => {
      expect(recoverSessionMock).toHaveBeenCalledWith('demo', 'event-1', '5551234567')
    })
    expect(reloadMock).toHaveBeenCalledOnce()
  })
})
