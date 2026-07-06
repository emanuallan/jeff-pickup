import { describe, expect, it } from 'vitest'
import {
  formatOrganizerNotificationCopy,
  organizerNotificationHref,
  type OrganizerNotification,
} from './organizer-notifications'

function feedbackNotification(
  overrides: Partial<Omit<OrganizerNotification, 'payload'>> & {
    payload?: Partial<OrganizerNotification['payload']>
  } = {},
): OrganizerNotification {
  const { payload: payloadOverrides, ...rest } = overrides
  return {
    id: 'n1',
    org_id: 'org-1',
    org_slug: 'demo',
    org_name: 'Demo Org',
    event_id: 'event-1',
    kind: 'session_feedback_immediate',
    payload: {
      count: 1,
      participant_names: ['Alex M.'],
      event_short_id: 'abc123',
      event_starts_at: '2026-07-01T18:00:00.000Z',
      event_label: 'Tuesday pickup',
      feedback_outcome: 'rated',
      rating: 4,
      ...payloadOverrides,
    },
    created_at: '2026-07-02T12:00:00.000Z',
    read_at: null,
    ...rest,
  }
}

describe('organizer-notifications session feedback', () => {
  it('formats rated feedback with star count', () => {
    const copy = formatOrganizerNotificationCopy(feedbackNotification())
    expect(copy.title).toBe('Alex M. left 4★ feedback')
    expect(copy.detail).toBe('Tuesday pickup')
  })

  it('formats no-attend feedback', () => {
    const copy = formatOrganizerNotificationCopy(
      feedbackNotification({
        payload: {
          feedback_outcome: 'no_attend',
          rating: null,
        },
      }),
    )
    expect(copy.title).toBe("Alex M. didn't attend")
  })

  it('links feedback notifications to the console feedback page', () => {
    expect(organizerNotificationHref(feedbackNotification())).toBe(
      '/console/demo/feedback?event=abc123',
    )
  })
})
