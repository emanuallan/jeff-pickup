import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type EventStatus = 'tentative' | 'on' | 'cancelled'

/** Sessions without a minimum start as on; min_players gates tentative until the threshold is met. */
export function initialEventStatus(minPlayers: number | null | undefined): EventStatus {
  return minPlayers != null ? 'tentative' : 'on'
}

export type Event = {
  id: string
  short_id: string
  org_id: string
  schedule_id: string | null
  location_id: string
  starts_at: string
  timezone: string
  duration_min: number
  capacity: number | null
  min_players: number | null
  status: EventStatus
  announcement: string
}

export type EventWithLocation = Event & {
  title: string | null
  location_label: string
  location_address: string
  location_lat: number
  location_lon: number
  location_maps_url: string
  location_is_online: boolean
  location_meeting_url: string
}

const LOCATION_SELECT =
  '*, locations(label, address, lat, lon, maps_url, is_online, meeting_url), schedules!events_schedule_id_fkey(title, duration_min)'

const EVENT_NAME_FALLBACK = 'Session'
export const DEFAULT_EVENT_DURATION_MIN = 90
/** Matches schedules.duration_min upper bound in the database. */
export const MAX_EVENT_DURATION_MIN = 480

type LocationJoin = {
  label: string
  address: string
  lat: number
  lon: number
  maps_url: string
  is_online: boolean
  meeting_url: string
} | null

function scheduleFromJoin(schedules: unknown): { title: string | null; duration_min: number } {
  if (schedules == null) {
    return { title: null, duration_min: DEFAULT_EVENT_DURATION_MIN }
  }
  const row = Array.isArray(schedules) ? schedules[0] : schedules
  if (!row || typeof row !== 'object') {
    return { title: null, duration_min: DEFAULT_EVENT_DURATION_MIN }
  }
  const title = (row as { title?: unknown }).title
  const duration = (row as { duration_min?: unknown }).duration_min
  return {
    title: typeof title === 'string' && title.trim() ? title.trim() : null,
    duration_min:
      typeof duration === 'number' && duration > 0 ? duration : DEFAULT_EVENT_DURATION_MIN,
  }
}

function eventOverridesFromRow(row: Record<string, unknown>): {
  title: string | null
  duration_min: number | null
} {
  const title = row.title
  const duration = row.duration_min
  return {
    title: typeof title === 'string' && title.trim() ? title.trim() : null,
    duration_min: typeof duration === 'number' && duration > 0 ? duration : null,
  }
}

function mapEventRow(row: Record<string, unknown>): EventWithLocation {
  const loc = row.locations as LocationJoin
  const schedule = scheduleFromJoin(row.schedules)
  const overrides = eventOverridesFromRow(row)
  const { locations: _locations, schedules: _schedules, ...event } = row
  return {
    ...(event as Event),
    timezone: String(event.timezone ?? 'UTC'),
    title: overrides.title ?? schedule.title,
    duration_min: overrides.duration_min ?? schedule.duration_min,
    location_label: loc?.label ?? 'Location',
    location_address: loc?.address ?? '',
    location_lat: loc?.lat ?? 0,
    location_lon: loc?.lon ?? 0,
    location_maps_url: loc?.maps_url ?? '',
    location_is_online: loc?.is_online ?? false,
    location_meeting_url: loc?.meeting_url ?? '',
  }
}

/** Memoized per-request so metadata + page share one query for the same event. */
export const getEventByRef = cache(
  async (shortId: string, orgId: string): Promise<EventWithLocation | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .select(LOCATION_SELECT)
      .eq('short_id', shortId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return mapEventRow(data)
  },
)

/** Internal lookup by UUID (analytics, RPCs, FK joins). */
export const getEventById = cache(
  async (eventId: string, orgId: string): Promise<EventWithLocation | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .select(LOCATION_SELECT)
      .eq('id', eventId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return mapEventRow(data)
  },
)

export async function getUpcomingEventsForOrg(
  orgId: string,
  limit = 20,
  includeCancelled = false,
): Promise<EventWithLocation[]> {
  return fetchActiveEventsForOrg(orgId, { limit, includeCancelled })
}

/** Upcoming sessions for the organizer console (all statuses), soonest first. */
export async function getUpcomingEventsForConsole(
  orgId: string,
  limit = 50,
): Promise<EventWithLocation[]> {
  return fetchActiveEventsForOrg(orgId, { limit, includeCancelled: true })
}

/** Past sessions for the organizer console (all statuses), most recent first. */
export async function getPastEventsForConsole(
  orgId: string,
  limit = 30,
): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const now = new Date()
  const fetchLimit = Math.min(Math.max(limit * 2, limit + 10), 100)

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .lt('starts_at', now.toISOString())
    .order('starts_at', { ascending: false })
    .limit(fetchLimit)

  if (error || !data) {
    return []
  }

  return data
    .map(mapEventRow)
    .filter((event) => isEventEnded(event, now))
    .slice(0, limit)
}

async function fetchActiveEventsForOrg(
  orgId: string,
  options: { limit: number; includeCancelled?: boolean },
): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const now = new Date()
  const lookbackIso = new Date(
    now.getTime() - MAX_EVENT_DURATION_MIN * 60_000,
  ).toISOString()
  const fetchLimit = Math.min(Math.max(options.limit * 2, options.limit + 10), 100)

  let query = supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .gte('starts_at', lookbackIso)

  if (!options.includeCancelled) {
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query
    .order('starts_at', { ascending: true })
    .limit(fetchLimit)

  if (error || !data) {
    return []
  }

  return data
    .map(mapEventRow)
    .filter((event) => !isEventEnded(event, now))
    .slice(0, options.limit)
}

export function formatEventDateTime(iso: string, timeZone?: string): string {
  const d = new Date(iso)
  const zone = timeZone || 'UTC'
  // "Weekday, Day @ Time" — e.g. "Monday, Jun 15 @ 6:00 PM"
  const date = d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: zone,
  })
  const time = d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  })
  return `${date} @ ${time}`
}

/** Format an event's starts_at in its stored timezone. */
export function formatEventTime(event: Pick<Event, 'starts_at' | 'timezone'>): string {
  return formatEventDateTime(event.starts_at, event.timezone)
}

/** Compact timestamp in a specific IANA zone — e.g. "Jun 17, 6:30 PM". */
export function formatInstantInZone(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'UTC',
  })
}

/** YYYY-MM-DD calendar key for a date in a given zone, for same-day comparisons. */
export function dayKeyInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone })
}

/** True once the event start time has passed (UTC instant comparison). */
export function isEventStarted(event: Pick<Event, 'starts_at'>, now = new Date()): boolean {
  return new Date(event.starts_at) < now
}

/** When the session ends (start + schedule duration). */
export function getEventEndTime(event: Pick<Event, 'starts_at' | 'duration_min'>): Date {
  return new Date(new Date(event.starts_at).getTime() + event.duration_min * 60_000)
}

/** True once the session duration has elapsed. */
export function isEventEnded(
  event: Pick<Event, 'starts_at' | 'duration_min'>,
  now = new Date(),
): boolean {
  return getEventEndTime(event) <= now
}

/** True while the session is underway (between start and end). */
export function isEventInProgress(
  event: Pick<Event, 'starts_at' | 'duration_min'>,
  now = new Date(),
): boolean {
  return isEventStarted(event, now) && !isEventEnded(event, now)
}

/** True while the current moment is on the event's calendar day in its timezone. */
export function isEventSameDay(
  event: Pick<Event, 'starts_at' | 'timezone'>,
  now = new Date(),
): boolean {
  const zone = event.timezone || 'UTC'
  return dayKeyInZone(event.starts_at, zone) === dayKeyInZone(now.toISOString(), zone)
}

/** Participants may sign up and update status until the session duration ends. */
export function canUpdateArrivalStatus(
  event: Pick<Event, 'starts_at' | 'duration_min'>,
  now = new Date(),
): boolean {
  return !isEventEnded(event, now)
}

/**
 * Relative day label in the event's zone: "Today", "Tomorrow", else
 * "Weekday, Mon D" (e.g. "Monday, Jun 15").
 */
export function formatEventDayLabel(event: Pick<Event, 'starts_at' | 'timezone'>): string {
  const zone = event.timezone || 'UTC'
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const eventKey = dayKeyInZone(event.starts_at, zone)
  if (eventKey === dayKeyInZone(now.toISOString(), zone)) return 'Today'
  if (eventKey === dayKeyInZone(tomorrow.toISOString(), zone)) return 'Tomorrow'

  return new Date(event.starts_at).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: zone,
  })
}

/** Just the time portion in the event's zone — e.g. "6:00 PM". */
export function formatEventTimeOnly(event: Pick<Event, 'starts_at' | 'timezone'>): string {
  return new Date(event.starts_at).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone || 'UTC',
  })
}

/**
 * Fuzzy "when" phrase for an upcoming event, e.g. "soon", "in a couple hours", "today",
 * "tomorrow", "this week", "next week", "next month", else "coming up soon".
 * Day/week/month boundaries are evaluated in the event's own timezone.
 */
export function formatEventHappening(event: Pick<Event, 'starts_at' | 'timezone'>): string {
  const zone = event.timezone || 'UTC'
  const now = new Date()
  const start = new Date(event.starts_at)
  const hoursAway = (start.getTime() - now.getTime()) / 3_600_000

  if (hoursAway >= 0 && hoursAway < 1) return 'soon'
  if (hoursAway >= 1 && hoursAway <= 3) return 'in a couple hours'

  const nowKey = dayKeyInZone(now.toISOString(), zone)
  const startKey = dayKeyInZone(event.starts_at, zone)
  const nowMidnight = new Date(`${nowKey}T00:00:00Z`)
  const startMidnight = new Date(`${startKey}T00:00:00Z`)
  const dayDiff = Math.round((startMidnight.getTime() - nowMidnight.getTime()) / 86_400_000)

  if (dayDiff <= 0) return 'today'
  if (dayDiff === 1) return 'tomorrow'

  // Weeks are Sunday-start; getUTCDay on the zone-local midnight gives the weekday.
  const daysLeftThisWeek = 6 - nowMidnight.getUTCDay()
  if (dayDiff <= daysLeftThisWeek) return 'this week'
  if (dayDiff <= daysLeftThisWeek + 7) return 'next week'

  const [nowYear, nowMonth] = nowKey.split('-').map(Number)
  const [startYear, startMonth] = startKey.split('-').map(Number)
  const monthDelta = (startYear - nowYear) * 12 + (startMonth - nowMonth)
  if (monthDelta === 1) return 'next month'

  return 'coming up soon'
}

export function statusLabel(status: EventStatus): string {
  if (status === 'on') return 'On'
  if (status === 'cancelled') return 'Cancelled'
  return 'Tentative'
}

/** Schedule title when present, otherwise a generic session label. */
export function eventDisplayName(title: string | null | undefined, fallback = EVENT_NAME_FALLBACK): string {
  return title?.trim() || fallback
}
