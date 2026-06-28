import type { OrgShareCardProps } from '@/lib/og-image'
import { formatEventWhenLine, eventDisplayName, pickFeaturedUpcomingEvent } from '@/lib/events'
import { getPublicOrgAndEvent, getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'

type ShareImageProps = Omit<OrgShareCardProps, 'organizrLogoSrc'>

function defaultTagline(orgDescription: string | undefined): string {
  return orgDescription?.trim() || "See who's coming and join in seconds."
}

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
      dateLine: formatEventWhenLine(nextEvent),
      locationLine: nextEvent.location_label || undefined,
      locationOnline: nextEvent.location_is_online,
      tagline: defaultTagline(org?.description),
    }
  }

  return {
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    sessionTitle: 'Upcoming sessions',
    dateLine: 'New dates posted soon',
    tagline: defaultTagline(org?.description),
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
    dateLine: event ? formatEventWhenLine(event) : 'Check the schedule',
    locationLine: event?.location_label || undefined,
    locationOnline: event?.location_is_online,
    tagline: defaultTagline(org?.description),
  }
}
