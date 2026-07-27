import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaidJoinSheet } from './paid-join-sheet'

const refreshMock = vi.fn()

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

vi.mock('../../participant-account-actions', () => ({
  saveParticipantAccount: vi.fn(async () => ({ error: 'not linked' })),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(async () => ({ error: null })),
    },
  }),
}))

const baseProps = {
  open: true,
  onClose: vi.fn(),
  orgId: 'org-1',
  orgSlug: 'demo',
  eventId: 'event-1',
  accent: '#2563eb',
  accentText: '#ffffff',
  priceLabel: '$5.00',
  priceCents: 500,
  joiningWaitlist: false,
  isAuthenticated: false,
  accountLinked: false,
  guestsEnabled: true,
  knownProfile: {
    firstName: 'Jeff',
    lastName: 'Pickup',
    phone: '12025550101',
  },
}

describe('PaidJoinSheet', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ ok: true, linked: true }, { status: 200 }),
      ),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('stays on payment after OTP when auth props update from refresh', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PaidJoinSheet {...baseProps} />)

    await user.type(screen.getByLabelText(/email/i), 'jeff@example.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/verification code/i)).toBeInTheDocument()
    })

    await user.type(screen.getByRole('textbox'), '123456')
    await user.click(screen.getByRole('button', { name: /verify & continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pay \$5\.00 & join/i })).toBeInTheDocument()
    })

    // Simulate parent re-render after router.refresh() with new auth + new knownProfile identity.
    rerender(
      <PaidJoinSheet
        {...baseProps}
        isAuthenticated
        accountLinked
        knownProfile={{
          firstName: 'Jeff',
          lastName: 'Pickup',
          phone: '12025550101',
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /pay \$5\.00 & join/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('skips email typing for a soft-session linked account', async () => {
    const user = userEvent.setup()
    render(
      <PaidJoinSheet
        {...baseProps}
        linkedAccountEmail="jeff@example.com"
      />,
    )

    expect(screen.getByText('jeff@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send code & continue/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /send code & continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/code sent to jeff@example.com/i)).toBeInTheDocument()
    })
  })

  it('goes straight to payment when already authenticated and linked', async () => {
    render(
      <PaidJoinSheet
        {...baseProps}
        isAuthenticated
        accountLinked
        linkedAccountEmail="jeff@example.com"
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pay \$5\.00 & join/i })).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send code/i })).not.toBeInTheDocument()
  })

  it('scales the pay subtotal by headcount when guests are selected', async () => {
    const user = userEvent.setup()
    render(
      <PaidJoinSheet
        {...baseProps}
        isAuthenticated
        accountLinked
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pay \$5\.00 & join/i })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox'), '2')

    expect(screen.getByText(/subtotal/i)).toBeInTheDocument()
    expect(screen.getByText(/\$5\.00 × 3 people/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay \$15\.00 & join/i })).toBeInTheDocument()
  })
})
