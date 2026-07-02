import type {
  CalendarShareEventItem,
  OrgCalendarShareCardProps,
  OrgShareCardProps,
} from '@/lib/og-image'
import {
  formatEventDayLabel,
  formatEventTimeRange,
  formatEventWhenLine,
  eventDisplayName,
  isEventCancelled,
  pickFeaturedUpcomingEvent,
} from '@/lib/events'
import type { EventWithLocation } from '@/lib/events'
import { getPublicOrgAndEvent, getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'

type EventShareImageProps = Omit<OrgShareCardProps, 'organizrLogoSrc'>
type CalendarShareImageProps = Omit<OrgCalendarShareCardProps, 'organizrLogoSrc'>

function clampShareText(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function toCalendarShareEvent(
  event: EventWithLocation,
  { includeAddress = false, addressMax = 56 }: { includeAddress?: boolean; addressMax?: number } = {},
): CalendarShareEventItem {
  const locationLine =
    event.location_label || (event.location_is_online ? 'Online session' : undefined)
  const rawAddress = !event.location_is_online ? event.location_address?.trim() : undefined

  return {
    title: eventDisplayName(event.title),
    whenLine: formatEventWhenLine(event),
    locationLine,
    addressLine:
      includeAddress && rawAddress ? clampShareText(rawAddress, addressMax) : undefined,
  }
}

export async function buildEventsListShareImageProps(slug: string): Promise<CalendarShareImageProps> {
  const org = await getPublicOrgBySlug(slug)
  const events = org ? await getPublicUpcomingEventsForOrg(org.id, 20, true) : []
  const featured = pickFeaturedUpcomingEvent(events)
  const upcoming = events
    .filter((ev) => !isEventCancelled(ev.status) && ev.id !== featured?.id)
    .slice(0, 2)

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    orgDescription: org?.description ? clampShareText(org.description, 120) : undefined,
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    featuredEvent: featured ? toCalendarShareEvent(featured, { includeAddress: true }) : undefined,
    upcomingEvents: upcoming.map((ev) => toCalendarShareEvent(ev)),
  }
}

export async function buildEventDetailShareImageProps(
  slug: string,
  eventId: string,
): Promise<EventShareImageProps> {
  const result = await getPublicOrgAndEvent(slug, eventId)
  const org = result?.org ?? null
  const event = result?.event ?? null

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    orgDescription: org?.description ? clampShareText(org.description, 120) : undefined,
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    sessionTitle: event ? eventDisplayName(event.title) : org?.name ?? 'Organizr',
    dayLabel: event ? formatEventDayLabel(event) : 'Schedule',
    timeLabel: event ? formatEventTimeRange(event) : 'Open now',
    locationLine: event?.location_label || undefined,
    locationAddress: event?.location_address?.trim() || undefined,
    locationOnline: event?.location_is_online,
  }
}
