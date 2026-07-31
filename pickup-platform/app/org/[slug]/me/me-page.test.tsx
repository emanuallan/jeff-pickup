import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeProfileForm } from './me-profile-form'
import { MeSignOutButton } from './me-sign-out-button'
import {
  clearParticipantDeviceSession,
  updateParticipantProfile,
} from '@/lib/participant-session-client'

const refresh = vi.fn()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace }),
}))

vi.mock('@/lib/participant-session-client', () => ({
  updateParticipantProfile: vi.fn(),
  clearParticipantDeviceSession: vi.fn(),
}))

const updateMock = vi.mocked(updateParticipantProfile)
const clearMock = vi.mocked(clearParticipantDeviceSession)

describe('MeProfileForm', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    refresh.mockReset()
    updateMock.mockReset()
    updateMock.mockResolvedValue({ ok: true })
  })

  it('saves editable fields and keeps phone read-only', async () => {
    const user = userEvent.setup()
    render(
      <MeProfileForm
        slug="jeffsoccer"
        accent="#22c55e"
        initial={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          displayName: 'Ada L.',
          email: 'ada@example.com',
          phone: '12025550101',
        }}
      />,
    )

    const phone = screen.getByDisplayValue(/202/)
    expect(phone).toHaveAttribute('readonly')

    await user.clear(screen.getByLabelText(/first name/i))
    await user.type(screen.getByLabelText(/first name/i), 'Augusta')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        slug: 'jeffsoccer',
        firstName: 'Augusta',
        lastName: 'Lovelace',
        displayName: 'Ada L.',
        email: 'ada@example.com',
      })
    })
    expect(refresh).toHaveBeenCalled()
  })
})

describe('MeSignOutButton', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    refresh.mockReset()
    replace.mockReset()
    clearMock.mockReset()
    clearMock.mockResolvedValue({ ok: true })
  })

  it('clears the device session then navigates home', async () => {
    const user = userEvent.setup()
    render(<MeSignOutButton accent="#22c55e" />)

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(clearMock).toHaveBeenCalledOnce()
    })
    expect(replace).toHaveBeenCalledWith('/')
    expect(refresh).toHaveBeenCalled()
  })

  it('surfaces clear failures without navigating', async () => {
    clearMock.mockResolvedValue({ error: 'Could not clear your session. Please try again.' })
    const user = userEvent.setup()
    render(<MeSignOutButton accent="#22c55e" />)

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(await screen.findByText(/could not clear your session/i)).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
