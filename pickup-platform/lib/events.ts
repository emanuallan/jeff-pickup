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
  location_label: string
  location_lat: number
  location_lon: number
  location_maps_url: string
  location_is_online: boolean
  location_meeting_url: string
}

const LOCATION_SELECT = '*, locations(label, lat, lon, maps_url, is_online, meeting_url)'

type LocationJoin = {
  label: string
  lat: number
  lon: number
  maps_url: string
  is_online: boolean
  meeting_url: string
} | null

function mapEventRow(row: Record<string, unknown>): EventWithLocation {
  const loc = row.locations as LocationJoin
  const { locations: _locations, ...event } = row
  return {
    ...(event as Event),
    timezone: String(event.timezone ?? 'UTC'),
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

export function statusLabel(status: EventStatus): string {
  if (status === 'on') return 'On'
  if (status === 'cancelled') return 'Cancelled'
  return 'Tentative'
}
