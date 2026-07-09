import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getPublicSponsors, getPublicSponsorshipPage } from '@/lib/sponsorship.server'
import { ORG_PUBLIC_CONTENT_MAX } from '@/lib/org-public-layout'
import { OrgPublicBackdrop } from '../_components/org-public-backdrop'
import { OrgHeader } from '../_components/org-header'
import { OrgPublicSiteFooter } from '../_components/org-public-site-footer'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function SponsorshipLayout({ children, params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [sponsors, page] = await Promise.all([
    getPublicSponsors(org.id),
    getPublicSponsorshipPage(slug),
  ])

  return (
    <>
      <OrgPublicBackdrop accent={org.branding.accent_color} />
      <main
        className={`mx-auto min-h-dvh px-5 py-6 sm:px-6 sm:py-8 ${ORG_PUBLIC_CONTENT_MAX}`}
      >
        <OrgHeader org={org} title={org.name} subtitle="Sponsor this group" logoPriority />
        <div className="mt-8">{children}</div>
        <OrgPublicSiteFooter
          slug={slug}
          sponsors={sponsors}
          showSponsorshipCta={page?.active ?? false}
        />
      </main>
    </>
  )
}
