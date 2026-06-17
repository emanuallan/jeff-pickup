import { notFound, redirect } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg } from '@/lib/events'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const events = await getUpcomingEventsForOrg(org.id, 1)
  const soonest = events[0]

  if (soonest) {
    redirect(`/events/${soonest.short_id}`)
  }

  redirect('/events')
}
