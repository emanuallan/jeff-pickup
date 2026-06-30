import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { OrgPlaceholderPage } from '../_components/org-placeholder-page'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function OrgStatsPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  return (
    <OrgPlaceholderPage
      org={org}
      title="Stats"
      activeKey="stats"
      description="Attendance trends and group milestones — coming soon."
    />
  )
}
