import { createClient } from '@/lib/supabase/server'

export type Schedule = {
  id: string
  org_id: string
  location_id: string
  title: string
  byweekday: number[]
  start_time: string
  duration_min: number
  capacity: number | null
  min_players: number | null
  interval_weeks: number
  anchor_date: string
  timezone: string
  is_active: boolean
  additional_information: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatWeekdays(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] ?? '?')
    .join(', ')
}

export function formatTime(t: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(t)
  if (!m) return t
  const h = Number.parseInt(m[1], 10)
  const min = m[2]
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${min} ${suffix}`
}

export function formatIntervalWeeks(weeks: number): string {
  if (weeks === 1) return 'Every week'
  return `Every ${weeks} weeks`
}

export function normalizeStartTime(t: string): string {
  return t.slice(0, 5)
}

export type ScheduleFormValues = {
  locationId: string
  title: string
  startTime: string
  timezone: string
  capacity: number | null
  minPlayers: number | null
  durationMin: number
  intervalWeeks: number
  byweekday: number[]
  additionalInformation: string
}

export function isStructuralScheduleChange(
  before: Pick<Schedule, 'byweekday' | 'start_time' | 'interval_weeks' | 'timezone'>,
  after: Pick<ScheduleFormValues, 'byweekday' | 'startTime' | 'intervalWeeks' | 'timezone'>,
): boolean {
  const sortedBefore = [...before.byweekday].sort((a, b) => a - b)
  const sortedAfter = [...after.byweekday].sort((a, b) => a - b)
  if (sortedBefore.length !== sortedAfter.length) return true
  if (sortedBefore.some((d, i) => d !== sortedAfter[i])) return true
  if (normalizeStartTime(before.start_time) !== after.startTime) return true
  if (before.interval_weeks !== after.intervalWeeks) return true
  if (before.timezone !== after.timezone) return true
  return false
}

export async function getSchedulesForOrg(orgId: string): Promise<Schedule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as Schedule[]
}

export type ScheduleDeleteImpact = {
  upcomingEventCount: number
  signupCount: number
  headcount: number
  nextEventLabel: string | null
  nextEventSignupCount: number
}

/** Upcoming sessions and sign-ups that would be removed with with_future_events delete. */
export async function getScheduleDeleteImpact(
  orgId: string,
  scheduleId: string,
): Promise<ScheduleDeleteImpact> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, starts_at, timezone, signups(guest_count)')
    .eq('org_id', orgId)
    .eq('schedule_id', scheduleId)
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })

  if (error || !events?.length) {
    return {
      upcomingEventCount: 0,
      signupCount: 0,
      headcount: 0,
      nextEventLabel: null,
      nextEventSignupCount: 0,
    }
  }

  let signupCount = 0
  let headcount = 0
  let nextEventSignupCount = 0

  for (const [index, event] of events.entries()) {
    const signups = (event.signups ?? []) as { guest_count: number }[]
    const eventSignupCount = signups.length
    const eventHeadcount = signups.reduce((sum, s) => sum + 1 + (s.guest_count ?? 0), 0)
    signupCount += eventSignupCount
    headcount += eventHeadcount
    if (index === 0) {
      nextEventSignupCount = eventSignupCount
    }
  }

  const first = events[0]
  const nextEventLabel = first
    ? new Date(first.starts_at).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: first.timezone || 'UTC',
      })
    : null

  return {
    upcomingEventCount: events.length,
    signupCount,
    headcount,
    nextEventLabel,
    nextEventSignupCount,
  }
}
