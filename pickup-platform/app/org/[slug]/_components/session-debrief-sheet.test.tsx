import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionDebriefSheet } from './session-debrief-sheet'
import {
  getSessionDebriefState,
  skipSessionDebriefStep,
  submitSessionMvpVote,
} from '../participant-notification-actions'
import type { SessionDebriefState } from '@/lib/session-debrief'

vi.mock('../participant-notification-actions', () => ({
  getSessionDebriefState: vi.fn(),
  submitSessionMvpVote: vi.fn(),
  skipSessionDebriefStep: vi.fn(),
  submitSessionPlayerStats: vi.fn(),
  submitSessionFeedback: vi.fn(),
  markSessionNoAttend: vi.fn(),
}))

const getSessionDebriefStateMock = vi.mocked(getSessionDebriefState)
const submitSessionMvpVoteMock = vi.mocked(submitSessionMvpVote)
const skipSessionDebriefStepMock = vi.mocked(skipSessionDebriefStep)

const payload = {
  event_short_id: 'abc123',
  event_label: 'Tuesday pickup',
  event_starts_at: '2026-07-01T18:00:00.000Z',
  location_label: 'Main Field',
}

const openMvpState: SessionDebriefState = {
  mvp_voting_enabled: true,
  player_stats_enabled: false,
  feedback_enabled: true,
  mvp_voting_open: true,
  mvp_vote_cast: false,
  mvp_nominee_participant_id: null,
  mvp_skipped: false,
  mvp_step_complete: false,
  stats_submitted: false,
  stats_skipped: false,
  stats_step_complete: true,
  feedback_submitted: false,
  feedback_skipped: false,
  feedback_step_complete: false,
  debrief_complete: false,
  initial_step: 'mvp',
  steps: ['mvp', 'feedback'],
  ballot: [{ participant_id: 'p2', display_name: 'Alex' }],
}

describe('SessionDebriefSheet', () => {
  afterEach(() => {
    cleanup()
    getSessionDebriefStateMock.mockReset()
    submitSessionMvpVoteMock.mockReset()
    skipSessionDebriefStepMock.mockReset()
  })

  it('shows closed MVP message when voting window has ended', async () => {
    getSessionDebriefStateMock.mockResolvedValue({
      ok: true,
      state: {
        ...openMvpState,
        mvp_voting_open: false,
      },
    })

    render(
      <SessionDebriefSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    expect(
      await screen.findByText(/mvp voting is only available for 12 hours/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('records MVP acknowledgment when voting is closed and Continue is pressed', async () => {
    const user = userEvent.setup()
    getSessionDebriefStateMock
      .mockResolvedValueOnce({
        ok: true,
        state: {
          ...openMvpState,
          mvp_voting_open: false,
          mvp_step_complete: true,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        state: {
          ...openMvpState,
          mvp_voting_open: false,
          mvp_step_complete: true,
          mvp_skipped: true,
        },
      })
    skipSessionDebriefStepMock.mockResolvedValue({ ok: true })

    render(
      <SessionDebriefSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(skipSessionDebriefStepMock).toHaveBeenCalledWith('demo', 'event-1', 'mvp')
    })
    expect(await screen.findByText('Rate this session')).toBeInTheDocument()
  })

  it('submits an MVP vote and advances to feedback', async () => {
    const user = userEvent.setup()
    getSessionDebriefStateMock
      .mockResolvedValueOnce({ ok: true, state: openMvpState })
      .mockResolvedValueOnce({
        ok: true,
        state: {
          ...openMvpState,
          mvp_step_complete: true,
          mvp_vote_cast: true,
          mvp_nominee_participant_id: 'p2',
        },
      })
    submitSessionMvpVoteMock.mockResolvedValue({ ok: true })

    render(
      <SessionDebriefSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: 'Submit vote' }))

    await waitFor(() => {
      expect(submitSessionMvpVoteMock).toHaveBeenCalledWith('demo', 'event-1', 'p2')
    })
    expect(await screen.findByText('Rate this session')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I did not attend' })).not.toBeInTheDocument()
  })

  it('skips MVP voting when requested', async () => {
    const user = userEvent.setup()
    getSessionDebriefStateMock
      .mockResolvedValueOnce({ ok: true, state: openMvpState })
      .mockResolvedValueOnce({
        ok: true,
        state: {
          ...openMvpState,
          mvp_step_complete: true,
          mvp_skipped: true,
        },
      })
    skipSessionDebriefStepMock.mockResolvedValue({ ok: true })

    render(
      <SessionDebriefSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Skip' }))

    await waitFor(() => {
      expect(skipSessionDebriefStepMock).toHaveBeenCalledWith('demo', 'event-1', 'mvp')
    })
    expect(await screen.findByText('Rate this session')).toBeInTheDocument()
  })

  it('hides skip feedback when MVP and stats are disabled', async () => {
    getSessionDebriefStateMock.mockResolvedValue({
      ok: true,
      state: {
        ...openMvpState,
        mvp_voting_enabled: false,
        player_stats_enabled: false,
        mvp_step_complete: true,
        stats_step_complete: true,
        initial_step: 'feedback',
        steps: ['feedback'],
      },
    })

    render(
      <SessionDebriefSheet
        open
        onClose={() => {}}
        orgSlug="demo"
        eventId="event-1"
        payload={payload}
        accent="#6366f1"
      />,
    )

    expect(await screen.findByText('Rate this session')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip feedback' })).not.toBeInTheDocument()
  })
})
