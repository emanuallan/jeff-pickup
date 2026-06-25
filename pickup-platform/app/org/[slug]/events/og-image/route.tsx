import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { formatEventWhenLine, pickFeaturedUpcomingEvent, eventDisplayName } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'
import { ogArrowRight } from '@/lib/text-arrows'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  const events = org ? await getPublicUpcomingEventsForOrg(org.id, 20, true) : []
  const nextEvent = pickFeaturedUpcomingEvent(events)
  const nextTitle = eventDisplayName(nextEvent?.title)

  return renderOrgOgImage({
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
  })
}
