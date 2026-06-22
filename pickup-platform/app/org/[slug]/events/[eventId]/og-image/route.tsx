import { getOrgBySlug } from '@/lib/orgs'
import { getEventByRef, formatEventTime, eventDisplayName } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'
import { ogArrowRight } from '@/lib/text-arrows'

type Context = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)
  const event = org ? await getEventByRef(eventId, org.id) : null
  const eventTitle = eventDisplayName(event?.title)

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: event ? 'Upcoming session' : undefined,
    headline: event ? eventTitle : org?.name ?? 'Organizr',
    subline: event
      ? formatEventTime(event) + (event.location_label ? ` · ${event.location_label}` : '')
      : undefined,
    locationOnline: event?.location_is_online,
    cta: event ? `Count me in ${ogArrowRight}` : undefined,
  })
}
