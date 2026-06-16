import { getOrgBySlug } from '@/lib/orgs'
import { getEventById, formatEventTime } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'

type Context = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)
  const event = org ? await getEventById(eventId, org.id) : null
  const eventTitle = event?.title?.trim() || org?.activity || 'Session'

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: event ? 'Upcoming session' : undefined,
    headline: event ? eventTitle : org?.name ?? 'Organizr',
    subline: event
      ? `${formatEventTime(event)}${event.location_label ? ` · ${event.location_label}` : ''}`
      : undefined,
    sublineEmoji: event ? (event.location_is_online ? '💻' : '📍') : undefined,
    cta: event ? 'Count me in →' : undefined,
  })
}
