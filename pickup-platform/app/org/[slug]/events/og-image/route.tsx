import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  const events = org ? await getUpcomingEventsForOrg(org.id, 1) : []
  const nextEvent = events[0]

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Headcount',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    headline: nextEvent ? formatEventTime(nextEvent) : 'Upcoming sessions',
    subline: nextEvent?.location_label ?? org?.activity,
    footer: nextEvent ? 'Join this session' : org?.activity || 'See who\'s coming',
    cta: nextEvent ? 'Tap to RSVP' : 'See sessions',
  })
}
