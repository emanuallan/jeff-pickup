import { getOrgBySlug } from '@/lib/orgs'
import { getEventById, formatEventDateTime } from '@/lib/events'
import { ogImageContentType, ogImageSize, renderOrgOgImage } from '@/lib/og-image'

export const alt = 'Event details'
export const size = ogImageSize
export const contentType = ogImageContentType

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export default async function Image({ params }: Props) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)
  const event = org ? await getEventById(eventId, org.id) : null

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Headcount',
    accent: org?.branding.accent_color ?? '#2563eb',
    headline: event ? formatEventDateTime(event.starts_at) : '',
    subline: event?.location_label,
    footer: org?.activity || 'See who\'s coming',
  })
}
