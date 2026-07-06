import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { eventDisplayName, formatEventTime } from '@/lib/events'
import type { SessionFeedbackRow } from '@/lib/session-feedback'

type FeedbackEventJoin = {
  starts_at: string
  timezone: string
  duration_min: number
  short_id: string
  title: string | null
  schedules: { title: string } | { title: string }[] | null
}

type FeedbackQueryRow = {
  id: string
  org_id: string
  event_id: string
  participant_id: string
  outcome: 'rated' | 'no_attend'
  rating: number | null
  comment: string | null
  created_at: string
  participants: { display_name: string } | { display_name: string }[] | null
  events: FeedbackEventJoin | FeedbackEventJoin[] | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function feedbackEventLabel(event: FeedbackEventJoin): string {
  const schedule = first(event.schedules)
  const title = event.title?.trim() || schedule?.title?.trim() || null
  if (title) return eventDisplayName(title)
  return formatEventTime(event)
}

function mapFeedbackRow(row: FeedbackQueryRow): SessionFeedbackRow {
  const event = first(row.events)
  const participant = first(row.participants)

  return {
    id: row.id,
    org_id: row.org_id,
    event_id: row.event_id,
    participant_id: row.participant_id,
    outcome: row.outcome,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    participant_display_name: participant?.display_name ?? 'Participant',
    event_starts_at: event?.starts_at ?? row.created_at,
    event_label: event ? feedbackEventLabel(event) : 'Session',
    event_short_id: event?.short_id ?? '',
  }
}

function feedbackSelect() {
  return `
    id,
    org_id,
    event_id,
    participant_id,
    outcome,
    rating,
    comment,
    created_at,
    participants(display_name),
    events(
      starts_at,
      timezone,
      duration_min,
      short_id,
      title,
      schedules!events_schedule_id_fkey(title)
    )
  `
}

export const getOrgSessionFeedback = cache(
  async (orgId: string, options?: { eventId?: string; limit?: number }) => {
    const supabase = await createClient()
    let query = supabase
      .from('session_feedback')
      .select(feedbackSelect())
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error || !data) {
      return [] as SessionFeedbackRow[]
    }

    return (data as unknown as FeedbackQueryRow[]).map(mapFeedbackRow)
  },
)

export const countRecentOrgSessionFeedback = cache(async (orgId: string, days = 30) => {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { count, error } = await supabase
    .from('session_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', since.toISOString())

  if (error) {
    return 0
  }

  return count ?? 0
})

export function formatFeedbackSessionWhen(row: SessionFeedbackRow): string {
  return formatEventTime({
    starts_at: row.event_starts_at,
    timezone: 'UTC',
    duration_min: 90,
  })
}
