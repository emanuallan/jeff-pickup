import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SessionFeedbackStep } from './session-feedback-step'

vi.mock('../participant-notification-actions', () => ({
  submitSessionFeedback: vi.fn(),
  markSessionNoAttend: vi.fn(),
}))

describe('SessionFeedbackStep', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows I did not attend by default', () => {
    render(
      <SessionFeedbackStep
        orgSlug="demo"
        eventId="event-1"
        accent="#6366f1"
        onComplete={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'I did not attend' })).toBeInTheDocument()
  })

  it('hides I did not attend when showNoAttendOption is false', () => {
    render(
      <SessionFeedbackStep
        orgSlug="demo"
        eventId="event-1"
        accent="#6366f1"
        showNoAttendOption={false}
        onComplete={() => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: 'I did not attend' })).not.toBeInTheDocument()
  })
})
