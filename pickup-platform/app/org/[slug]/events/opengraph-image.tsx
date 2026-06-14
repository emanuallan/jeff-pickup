import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventDateTime } from '@/lib/events'
import { ogImageContentType, ogImageSize, renderOrgOgImage } from '@/lib/og-image'

export const alt = 'Upcoming sessions'
export const size = ogImageSize
export const contentType = ogImageContentType

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  const events = org ? await getUpcomingEventsForOrg(org.id, 1) : []
  const nextEvent = events[0]

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Headcount',
    accent: org?.branding.accent_color ?? '#2563eb',
    headline: nextEvent ? formatEventDateTime(nextEvent.starts_at) : 'Upcoming sessions',
    subline: nextEvent?.location_label ?? org?.activity,
    footer: nextEvent ? 'Join this session' : org?.activity || 'See who\'s coming',
  })
}
