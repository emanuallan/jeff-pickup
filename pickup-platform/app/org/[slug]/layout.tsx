import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getParticipantForSession } from '@/lib/participant'
import { getSessionToken } from '@/lib/participant-session'
import { orgFeatures } from '@/lib/org-features'
import { getPublicSponsors } from '@/lib/sponsorship.server'
import { OrgPublicSplash } from './_components/org-public-splash'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function OrgPublicLayout({ children, params }: Props) {
  const { slug } = await params
  const [org, sessionToken] = await Promise.all([
    getPublicOrgBySlug(slug),
    getSessionToken(),
  ])

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [participant, sponsors] = await Promise.all([
    getParticipantForSession(sessionToken, org.id),
    orgFeatures(org).group_sponsorships ? getPublicSponsors(org.id) : Promise.resolve([]),
  ])

  return (
    <>
      <OrgPublicSplash
        slug={slug}
        orgName={org.name}
        accent={org.branding.accent_color}
        orgLogoUrl={org.branding.logo_url}
        participantFirstName={participant?.first_name}
        sponsors={sponsors}
      />
      {children}
    </>
  )
}
