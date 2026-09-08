import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SignedInGuestSection } from './signed-in-guest-section'

vi.mock('./roster-list', () => ({
  GuestCountEditor: () => <div data-testid="guest-count-editor" />,
}))

describe('SignedInGuestSection', () => {
  afterEach(() => {
    cleanup()
  })

  const base = {
    orgSlug: 'demo',
    eventId: 'event-1',
    signupId: 'signup-1',
    guestCount: 2,
    listStatus: 'confirmed' as const,
    accent: '#2563eb',
  }

  it('hides guest controls when guests are disabled', () => {
    const { container } = render(
      <SignedInGuestSection {...base} guestsEnabled={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('locks guest count after payment instead of showing the editor', () => {
    render(<SignedInGuestSection {...base} guestsEnabled paidSession />)

    expect(screen.getByText(/guest count is locked after payment/i)).toBeInTheDocument()
    expect(screen.getByText(/2 guests/i)).toBeInTheDocument()
    expect(screen.queryByTestId('guest-count-editor')).not.toBeInTheDocument()
  })
})
