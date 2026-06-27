import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/public'
import {
  PUBLIC_EVENTS_REVALIDATE,
  PUBLIC_ORG_REVALIDATE,
  withPublicCache,
} from '@/lib/public-cache'
import { parseOrgRow, type Org } from '@/lib/orgs'
import {
  mapEventRow,
  MAX_EVENT_DURATION_MIN,
  isEventEnded,
  type EventWithLocation,
} from '@/lib/events'
import type { RosterEntry } from '@/lib/signups'

const LOCATION_SELECT =
  '*, locations(label, address, lat, lon, maps_url, is_online, meeting_url), schedules!events_schedule_id_fkey(title, duration_min)'

async function fetchPublicOrgBySlug(slug: string): Promise<Org | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('id, slug, name, description, status, default_locale, branding, settings')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return parseOrgRow(data)
}

/** Active org by slug — cookie-less client + cross-request cache for public pages. */
export const getPublicOrgBySlug = cache(async (slug: string): Promise<Org | null> => {
  return withPublicCache(
    ['public-org', slug],
    PUBLIC_ORG_REVALIDATE,
    [`org:${slug}`],
    () => fetchPublicOrgBySlug(slug),
  )
})

export type PublicOrgAndEvent = {
  org: Org
  event: EventWithLocation | null
}

async function fetchPublicEventByRef(
  eventRef: string,
  orgId: string,
): Promise<EventWithLocation | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('short_id', eventRef)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapEventRow(data as Record<string, unknown>)
}

async function fetchPublicOrgAndEvent(
  slug: string,
  eventRef: string,
): Promise<PublicOrgAndEvent | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc('get_public_org_and_event', {
    p_slug: slug,
    p_event_ref: eventRef,
  })

  if (error) {
    console.error('get_public_org_and_event RPC failed:', error.message)
    const org = await fetchPublicOrgBySlug(slug)
    if (!org) return null
    const event = await fetchPublicEventByRef(eventRef, org.id)
    return { org, event }
  }

  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as { org?: Record<string, unknown>; event?: Record<string, unknown> | null }
  if (!payload.org) {
    return null
  }

  const org = parseOrgRow(payload.org)
  const event = payload.event ? mapEventRow(payload.event) : null

  return { org, event }
}

/** Org + event in one DB round trip for public event pages. */
export const getPublicOrgAndEvent = cache(
  async (slug: string, eventRef: string): Promise<PublicOrgAndEvent | null> => {
    return withPublicCache(
      ['public-org-event', slug, eventRef],
      PUBLIC_EVENTS_REVALIDATE,
      [`org:${slug}`, `event:${slug}:${eventRef}`],
      () => fetchPublicOrgAndEvent(slug, eventRef),
    )
  },
)

async function fetchPublicUpcomingEvents(
  orgId: string,
  limit: number,
  includeCancelled: boolean,
): Promise<EventWithLocation[]> {
  const supabase = createPublicClient()
  const now = new Date()
  const lookbackIso = new Date(
    now.getTime() - MAX_EVENT_DURATION_MIN * 60_000,
  ).toISOString()
  const fetchLimit = Math.min(Math.max(limit * 2, limit + 10), 100)

  let query = supabase
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .gte('starts_at', lookbackIso)

  if (!includeCancelled) {
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query
    .order('starts_at', { ascending: true })
    .limit(fetchLimit)

  if (error || !data) {
    return []
  }

  return data
    .map((row) => mapEventRow(row as Record<string, unknown>))
    .filter((event) => !isEventEnded(event, now))
    .slice(0, limit)
}

/** Upcoming events for public org pages — cookie-less + cached. */
export const getPublicUpcomingEventsForOrg = cache(
  async (
    orgId: string,
    limit = 20,
    includeCancelled = false,
  ): Promise<EventWithLocation[]> => {
    return withPublicCache(
      ['public-upcoming-events', orgId, String(limit), String(includeCancelled)],
      PUBLIC_EVENTS_REVALIDATE,
      [`org-events:${orgId}`],
      () => fetchPublicUpcomingEvents(orgId, limit, includeCancelled),
    )
  },
)

async function fetchPublicRoster(eventId: string): Promise<RosterEntry[]> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('event_roster_public')
    .select('id, event_id, participant_id, display_name, guest_count, arrival_status, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as RosterEntry[]
}

/** Always fresh — roster changes on every join/leave and must not use unstable_cache. */
export async function getPublicRosterLive(eventId: string): Promise<RosterEntry[]> {
  return fetchPublicRoster(eventId)
}

async function fetchPublicPastSessionCount(orgId: string): Promise<number> {
  const supabase = createPublicClient()
  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .lt('starts_at', now)

  if (error || count == null) return 0
  return count
}

/** Past session count for public leaderboard gating — cached. */
export const getPublicOrgPastSessionCount = cache(async (orgId: string): Promise<number> => {
  return withPublicCache(
    ['public-past-session-count', orgId],
    PUBLIC_ORG_REVALIDATE,
    [`org:${orgId}`],
    () => fetchPublicPastSessionCount(orgId),
  )
})

type EventSummary = Pick<
  EventWithLocation,
  'id' | 'short_id' | 'status' | 'starts_at' | 'duration_min'
>

async function fetchPublicUpcomingSummaries(
  orgId: string,
  limit: number,
  includeCancelled: boolean,
): Promise<EventSummary[]> {
  const supabase = createPublicClient()
  const now = new Date()
  const lookbackIso = new Date(
    now.getTime() - MAX_EVENT_DURATION_MIN * 60_000,
  ).toISOString()
  const fetchLimit = Math.min(Math.max(limit * 2, limit + 10), 100)

  let query = supabase
    .from('events')
    .select('id, short_id, status, starts_at, duration_min')
    .eq('org_id', orgId)
    .gte('starts_at', lookbackIso)

  if (!includeCancelled) {
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query
    .order('starts_at', { ascending: true })
    .limit(fetchLimit)

  if (error || !data) {
    return []
  }

  return data
    .filter((row) => !isEventEnded(row as EventSummary, now))
    .slice(0, limit) as EventSummary[]
}

export const getPublicNextActiveUpcomingEvent = cache(
  async (orgId: string): Promise<Pick<EventWithLocation, 'short_id'> | null> => {
    const summaries = await withPublicCache(
      ['public-next-event', orgId],
      PUBLIC_EVENTS_REVALIDATE,
      [`org-events:${orgId}`],
      () => fetchPublicUpcomingSummaries(orgId, 1, false),
    )
    return summaries[0] ?? null
  },
)

export async function getPublicHasMultipleActiveUpcomingEvents(
  orgId: string,
): Promise<boolean> {
  const summaries = await withPublicCache(
    ['public-upcoming-count', orgId],
    PUBLIC_EVENTS_REVALIDATE,
    [`org-events:${orgId}`],
    () => fetchPublicUpcomingSummaries(orgId, 2, false),
  )
  return summaries.length > 1
}
