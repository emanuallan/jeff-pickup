import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
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

  return (
    <>
      <OrgPublicBackdrop accent={org.branding.accent_color} />
      <main
        className={`mx-auto min-h-dvh px-5 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 ${ORG_PUBLIC_CONTENT_MAX}`}
      >
        <OrgHeader
          org={org}
          title={org.name}
          eyebrow="Sponsorship"
          subtitle="Help keep this community going"
          logoPriority
        />
        <div className="mt-8">{children}</div>
        <OrgPublicSiteFooter
          slug={slug}
          orgName={org.name}
          accent={org.branding.accent_color}
          showSponsorshipCta={false}
          showPoweredByOnMobile
        />
      </main>
    </>
  )
}
