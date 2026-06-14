import { getOrgBySlug } from '@/lib/orgs'
import { getEventById, formatEventDateTime } from '@/lib/events'
import { renderOrgOgImage } from '@/lib/og-image'

type Context = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)
  const event = org ? await getEventById(eventId, org.id) : null

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Headcount',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    headline: event ? formatEventDateTime(event.starts_at) : '',
    subline: event?.location_label,
    footer: org?.activity || 'See who\'s coming',
  })
}
