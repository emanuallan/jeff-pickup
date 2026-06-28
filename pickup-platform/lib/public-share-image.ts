import type { OrgShareCardProps } from '@/lib/og-image'
import {
  formatEventDayLabel,
  formatEventTimeOnly,
  eventDisplayName,
  pickFeaturedUpcomingEvent,
} from '@/lib/events'
import { getPublicOrgAndEvent, getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'

type ShareImageProps = Omit<OrgShareCardProps, 'organizrLogoSrc'>

export async function buildEventsListShareImageProps(slug: string): Promise<ShareImageProps> {
  const org = await getPublicOrgBySlug(slug)
  const events = org ? await getPublicUpcomingEventsForOrg(org.id, 20, true) : []
  const nextEvent = pickFeaturedUpcomingEvent(events)

  if (nextEvent) {
    return {
      slug,
      orgName: org?.name ?? 'Organizr',
      accent: org?.branding.accent_color ?? '#2563eb',
      logoUrl: org?.branding.logo_url,
      sessionTitle: eventDisplayName(nextEvent.title),
      dayLabel: formatEventDayLabel(nextEvent),
      timeLabel: formatEventTimeOnly(nextEvent),
      locationLine: nextEvent.location_label || undefined,
      locationOnline: nextEvent.location_is_online,
    }
  }

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    sessionTitle: 'Upcoming sessions',
    dayLabel: 'Schedule',
    timeLabel: 'Open now',
  }
}

export async function buildEventDetailShareImageProps(
  slug: string,
  eventId: string,
): Promise<ShareImageProps> {
  const result = await getPublicOrgAndEvent(slug, eventId)
  const org = result?.org ?? null
  const event = result?.event ?? null

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    sessionTitle: event ? eventDisplayName(event.title) : org?.name ?? 'Organizr',
    dayLabel: event ? formatEventDayLabel(event) : 'Schedule',
    timeLabel: event ? formatEventTimeOnly(event) : 'Open now',
    locationLine: event?.location_label || undefined,
    locationOnline: event?.location_is_online,
  }
}
