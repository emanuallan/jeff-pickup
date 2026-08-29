import { Suspense } from 'react'
import { getOrgForMember } from '@/lib/orgs'
import { OrgHomeBottomNav } from './org-home-bottom-nav'
import type { OrgPublicNavItem } from '@/lib/org-public-nav'
import type { PublicSponsor } from '@/lib/sponsorship'

type Props = {
  items: OrgPublicNavItem[]
  accent: string
  basePath: string
  slug: string
  orgName: string
  orgLogoUrl?: string | null
  feedEnabled?: boolean
  sponsors?: PublicSponsor[]
}

async function OrgHomeBottomNavWithOrganizer(props: Props) {
  const membership = await getOrgForMember(props.slug)
  return <OrgHomeBottomNav {...props} isOrganizer={!!membership} />
}

/** Visitor chrome first; organizer console link streams in after Auth. */
export function OrgHomeBottomNavSlot(props: Props) {
  return (
    <Suspense fallback={<OrgHomeBottomNav {...props} isOrganizer={false} />}>
      <OrgHomeBottomNavWithOrganizer {...props} />
    </Suspense>
  )
}
