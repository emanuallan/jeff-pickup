import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaidJoinSheet } from './paid-join-sheet'

describe('PaidJoinSheet', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('starts checkout with soft profile details and email', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.test/session' }),
    })

    render(
      <PaidJoinSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        accent="#2563eb"
        accentText="#fff"
        priceLabel="$15.00"
        priceCents={1500}
        joiningWaitlist={false}
        guestsEnabled
        knownProfile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '12025550101',
        }}
      />,
    )

    await user.type(screen.getByLabelText(/^email$/i), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /pay · \$15\.00/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/session-payment/checkout',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as { body?: string })?.body ?? '{}'),
    ) as Record<string, unknown>
    expect(body).toMatchObject({
      slug: 'demo',
      eventId: 'event-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '12025550101',
      email: 'ada@example.com',
    })
  })

  it('shows a read-only name and email when a receipt email is already on file', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.test/session' }),
    })

    render(
      <PaidJoinSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        accent="#2563eb"
        accentText="#fff"
        priceLabel="$5.00"
        priceCents={500}
        joiningWaitlist={false}
        guestsEnabled={false}
        knownProfile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '12025550101',
          email: 'ada@example.com',
        }}
      />,
    )

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pay · \$5\.00/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })

    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as { body?: string })?.body ?? '{}'),
    ) as Record<string, unknown>
    expect(body.email).toBe('ada@example.com')
  })

  it('breaks down guest pricing and explains the refund path', () => {
    render(
      <PaidJoinSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        accent="#2563eb"
        accentText="#fff"
        priceLabel="$10.00"
        priceCents={1000}
        joiningWaitlist={false}
        guestsEnabled
        initialGuestCount={2}
        knownProfile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '12025550101',
          email: 'ada@example.com',
        }}
      />,
    )

    expect(screen.getByText(/2 guests/i)).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('$30.00')).toBeInTheDocument()
    expect(screen.getByText(/^total$/i)).toBeInTheDocument()
    expect(screen.getByText(/charged once at checkout/i)).toBeInTheDocument()
    expect(screen.getByText(/refunds are handled by the group admin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay · \$30\.00/i })).toBeInTheDocument()
  })

  it('shows a generic message when checkout fails to start', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Could not start checkout.',
        detail: "The provided key 'sk_live_***' does not have access to account 'acct_***'",
      }),
    })

    render(
      <PaidJoinSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        accent="#2563eb"
        accentText="#fff"
        priceLabel="$5.00"
        priceCents={500}
        joiningWaitlist={false}
        guestsEnabled={false}
        knownProfile={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '12025550101',
          email: 'ada@example.com',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /pay · \$5\.00/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/not available at this time\. please try again later\./i),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/sk_live_/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/acct_/i)).not.toBeInTheDocument()
  })
})
