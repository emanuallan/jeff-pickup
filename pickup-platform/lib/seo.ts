import type { Metadata } from 'next'
import type { EventWithLocation } from '@/lib/events'
import { eventDisplayName } from '@/lib/events'
import type { Org } from '@/lib/orgs'
import { orgBaseUrl, rootBaseUrl } from '@/lib/og-metadata'

export const ROBOTS_PUBLIC: Metadata['robots'] = { index: true, follow: true }
export const ROBOTS_PRIVATE: Metadata['robots'] = { index: false, follow: false }

function eventEndIso(event: Pick<EventWithLocation, 'starts_at' | 'duration_min'>): string {
  return new Date(
    new Date(event.starts_at).getTime() + event.duration_min * 60_000,
  ).toISOString()
}

/** Marketing site — WebSite + Organization. */
export function buildWebsiteJsonLd() {
  const baseUrl = rootBaseUrl()
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Organizr',
      url: baseUrl,
      description:
        "Organizr is the easy headcount for recurring group activities — share a link, see who's coming, and run your sessions.",
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Organizr',
      url: baseUrl,
      description:
        'Simple sign-ups and live rosters for pickup sports, run clubs, meetups, and recurring group activities.',
    },
  ]
}

/** Public org schedule page. */
export function buildOrgJsonLd(org: Org) {
  const url = orgBaseUrl(org.slug)
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: org.name,
    url,
    ...(org.description ? { description: org.description } : {}),
    ...(org.branding.logo_url ? { logo: org.branding.logo_url } : {}),
  }
}

/** Public event detail page. */
export function buildEventJsonLd(org: Org, event: EventWithLocation, path: string) {
  const url = `${orgBaseUrl(org.slug)}${path}`
  const name = eventDisplayName(event.title)
  const isCancelled = event.status === 'cancelled'

  const location = event.location_is_online
    ? {
        '@type': 'VirtualLocation',
        url: event.location_meeting_url || url,
      }
    : {
        '@type': 'Place',
        name: event.location_label,
        ...(event.location_address
          ? { address: { '@type': 'PostalAddress', streetAddress: event.location_address } }
          : {}),
      }

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `${name} · ${org.name}`,
    description: org.description
      ? `${org.description} with ${org.name}`
      : `Group session with ${org.name}`,
    startDate: event.starts_at,
    endDate: eventEndIso(event),
    eventStatus: isCancelled
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.location_is_online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location,
    organizer: {
      '@type': 'Organization',
      name: org.name,
      url: orgBaseUrl(org.slug),
    },
    url,
  }
}
