import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionFeedbackSheet } from './session-feedback-sheet'
import { submitSessionFeedback } from '../participant-notification-actions'

vi.mock('../participant-notification-actions', () => ({
  submitSessionFeedback: vi.fn(),
  markSessionNoAttend: vi.fn(),
}))

const submitSessionFeedbackMock = vi.mocked(submitSessionFeedback)

const payload = {
  event_short_id: 'abc123',
  event_label: 'Tuesday pickup',
  event_starts_at: '2026-07-01T18:00:00.000Z',
  location_label: 'Main Field',
}

describe('SessionFeedbackSheet', () => {
  afterEach(() => {
    cleanup()
    submitSessionFeedbackMock.mockReset()
  })

  it('expands comments when rating is below 5 and requires them at 2 stars', async () => {
    const user = userEvent.setup()

    render(
      <SessionFeedbackSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    expect(screen.queryByLabelText(/comments/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(screen.getByLabelText(/comments \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit feedback' })).not.toBeDisabled()

    await user.click(screen.getByRole('radio', { name: '2 stars' }))
    expect(screen.getByLabelText(/comments \(required\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit feedback' })).toBeDisabled()

    await user.type(screen.getByLabelText(/comments \(required\)/i), 'Needs better warmup')
    expect(screen.getByRole('button', { name: 'Submit feedback' })).not.toBeDisabled()
  })

  it('shows optional expanded comments for 5 stars', async () => {
    const user = userEvent.setup()

    render(
      <SessionFeedbackSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    expect(screen.getByLabelText(/comments \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit feedback' })).not.toBeDisabled()
  })

  it('calls onSubmitted with rated after a successful submit', async () => {
    const user = userEvent.setup()
    submitSessionFeedbackMock.mockResolvedValue({ ok: true })
    const onSubmitted = vi.fn()

    render(
      <SessionFeedbackSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
        onSubmitted={onSubmitted}
      />,
    )

    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(submitSessionFeedbackMock).toHaveBeenCalledWith('demo', 'event-1', 5, '')
    expect(onSubmitted).toHaveBeenCalledWith('rated')
  })
})
