import { createClient } from '@/lib/supabase/server'

export type EventStatus = 'tentative' | 'on' | 'cancelled'

export type Event = {
  id: string
  org_id: string
  schedule_id: string | null
  location_id: string
  starts_at: string
  timezone: string
  capacity: number | null
  min_players: number
  status: EventStatus
  announcement: string
}

export type EventWithLocation = Event & {
  title: string | null
  location_label: string
  location_lat: number
  location_lon: number
  location_maps_url: string
  location_is_online: boolean
  location_meeting_url: string
}

const LOCATION_SELECT =
  '*, locations(label, lat, lon, maps_url, is_online, meeting_url), schedules(title)'

type LocationJoin = {
  label: string
  lat: number
  lon: number
  maps_url: string
  is_online: boolean
  meeting_url: string
} | null

type ScheduleJoin = {
  title: string
} | null

function mapEventRow(row: Record<string, unknown>): EventWithLocation {
  const loc = row.locations as LocationJoin
  const sched = row.schedules as ScheduleJoin
  const { locations: _locations, schedules: _schedules, ...event } = row
  return {
    ...(event as Event),
    timezone: String(event.timezone ?? 'UTC'),
    title: sched?.title ?? null,
    location_label: loc?.label ?? 'Location',
    location_lat: loc?.lat ?? 0,
    location_lon: loc?.lon ?? 0,
    location_maps_url: loc?.maps_url ?? '',
    location_is_online: loc?.is_online ?? false,
    location_meeting_url: loc?.meeting_url ?? '',
  }
}

export async function getEventById(
  eventId: string,
  orgId: string,
): Promise<EventWithLocation | null> {
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
}

export async function getUpcomingEventsForOrg(
  orgId: string,
  limit = 20,
): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .gte('starts_at', now)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(mapEventRow)
}

/** Upcoming sessions for the organizer console (all statuses), soonest first. */
export async function getUpcomingEventsForConsole(
  orgId: string,
  limit = 50,
): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(mapEventRow)
}

/** Past sessions for the organizer console (all statuses), most recent first. */
export async function getPastEventsForConsole(
  orgId: string,
  limit = 30,
): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .lt('starts_at', now)
    .order('starts_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(mapEventRow)
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

/** YYYY-MM-DD calendar key for a date in a given zone, for same-day comparisons. */
function dayKeyInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone })
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

export function statusLabel(status: EventStatus): string {
  if (status === 'on') return 'On'
  if (status === 'cancelled') return 'Cancelled'
  return 'Tentative'
}
