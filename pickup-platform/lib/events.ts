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
}

const LOCATION_SELECT = '*, locations(label, lat, lon, maps_url)'

type LocationJoin = { label: string; lat: number; lon: number; maps_url: string } | null

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

export async function getEventsForOrgConsole(orgId: string): Promise<EventWithLocation[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .gte('starts_at', since.toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  if (error || !data) {
    return []
  }

  return data.map(mapEventRow)
}

export function formatEventDateTime(iso: string, timeZone?: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'UTC',
  })
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
