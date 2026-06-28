import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 1)
  const soonest = events[0]

  if (soonest) {
    redirect(`/cal/${soonest.short_id}`)
  }

  redirect('/cal')
}
