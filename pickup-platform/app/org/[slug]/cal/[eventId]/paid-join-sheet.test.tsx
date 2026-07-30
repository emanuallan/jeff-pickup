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

  it('starts checkout with soft profile details', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.test/session' }),
    })
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', assign: assignMock },
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
    })
  })

  it('shows checkout errors from the API', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Could not start checkout.', detail: 'Connect offline' }),
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
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /pay · \$5\.00/i }))

    await waitFor(() => {
      expect(screen.getByText(/could not start checkout/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/connect offline/i)).toBeInTheDocument()
  })
})
