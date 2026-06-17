import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime, eventDisplayName } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'
import { arrowRight } from '@/lib/text-arrows'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  const events = org ? await getUpcomingEventsForOrg(org.id, 1) : []
  const nextEvent = events[0]
  const nextTitle = eventDisplayName(nextEvent?.title)

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: nextEvent ? 'Next session' : 'Upcoming',
    headline: nextEvent ? nextTitle : 'Upcoming sessions',
    subline: nextEvent
      ? formatEventTime(nextEvent) +
        (nextEvent.location_label ? ` · ${nextEvent.location_label}` : '')
      : org?.activity,
    locationOnline: nextEvent?.location_is_online,
    cta: nextEvent ? `Count me in ${arrowRight}` : undefined,
  })
}
