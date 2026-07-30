import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionPaymentBadge } from './session-payment-badge'

const refreshMock = vi.fn()
const refundMock = vi.fn()
const removeMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('./payment-actions', () => ({
  refundSessionSignupPayment: (...args: unknown[]) => refundMock(...args),
}))

vi.mock('./edit/roster-actions', () => ({
  removeSessionRosterSignup: (...args: unknown[]) => removeMock(...args),
}))

vi.mock('../../../_components/console-toast', () => ({
  useConsoleToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}))

describe('SessionPaymentBadge', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    refreshMock.mockReset()
    refundMock.mockReset()
    removeMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    refundMock.mockResolvedValue({ ok: true, refundedAmountCents: 920 })
    removeMock.mockResolvedValue({ ok: true })
  })

  afterEach(() => cleanup())

  it('refunds first, then asks whether to remove the participant', async () => {
    const user = userEvent.setup()
    render(
      <SessionPaymentBadge
        orgSlug="demo"
        eventRef="event-1"
        paymentId="payment-1"
        signupId="signup-1"
        participantName="Ada"
        amountCents={1000}
        status="completed"
      />,
    )

    await user.click(screen.getByRole('button', { name: /paid \$10\.00/i }))
    await user.click(screen.getByRole('button', { name: /refund minus fees/i }))

    await waitFor(() => {
      expect(refundMock).toHaveBeenCalledWith(
        'demo',
        'event-1',
        'payment-1',
        'retain_fees',
      )
    })
    expect(await screen.findByRole('heading', { name: /remove ada/i })).toBeInTheDocument()
    expect(screen.getByText(/\$9\.20 was refunded/i)).toBeInTheDocument()
    expect(removeMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /remove from roster/i }))
    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith('demo', 'event-1', 'signup-1')
    })
    expect(refreshMock).toHaveBeenCalled()
  })

  it('allows keeping the participant after the refund', async () => {
    const user = userEvent.setup()
    render(
      <SessionPaymentBadge
        orgSlug="demo"
        eventRef="event-1"
        paymentId="payment-1"
        signupId="signup-1"
        participantName="Ada"
        amountCents={1000}
        status="completed"
      />,
    )

    await user.click(screen.getByRole('button', { name: /paid \$10\.00/i }))
    await user.click(screen.getByRole('button', { name: /full refund/i }))
    await screen.findByRole('heading', { name: /remove ada/i })
    await user.click(screen.getByRole('button', { name: /keep on roster/i }))

    expect(refundMock).toHaveBeenCalledWith('demo', 'event-1', 'payment-1', 'full')
    expect(removeMock).not.toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalled()
  })
})
