import type { OrgOgCardProps } from '@/lib/og-image'
import { formatEventWhenLine, eventDisplayName, pickFeaturedUpcomingEvent } from '@/lib/events'
import { getPublicOrgAndEvent, getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { ogArrowRight } from '@/lib/text-arrows'

export async function buildEventsListShareImageProps(
  slug: string,
): Promise<OrgOgCardProps> {
  const org = await getPublicOrgBySlug(slug)
  const events = org ? await getPublicUpcomingEventsForOrg(org.id, 20, true) : []
  const nextEvent = pickFeaturedUpcomingEvent(events)
  const nextTitle = eventDisplayName(nextEvent?.title)

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: nextEvent ? 'Next session' : 'Upcoming',
    headline: nextEvent ? nextTitle : 'Upcoming sessions',
    subline: nextEvent
      ? formatEventWhenLine(nextEvent) +
        (nextEvent.location_label ? ` · ${nextEvent.location_label}` : '')
      : org?.description,
    locationOnline: nextEvent?.location_is_online,
    cta: nextEvent ? `Count me in ${ogArrowRight}` : undefined,
  }
}

export async function buildEventDetailShareImageProps(
  slug: string,
  eventId: string,
): Promise<OrgOgCardProps> {
  const result = await getPublicOrgAndEvent(slug, eventId)
  const org = result?.org ?? null
  const event = result?.event ?? null
  const eventTitle = eventDisplayName(event?.title)

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: event ? 'Upcoming session' : undefined,
    headline: event ? eventTitle : org?.name ?? 'Organizr',
    subline: event
      ? formatEventWhenLine(event) + (event.location_label ? ` · ${event.location_label}` : '')
      : undefined,
    locationOnline: event?.location_is_online,
    cta: event ? `Count me in ${ogArrowRight}` : undefined,
  }
}
