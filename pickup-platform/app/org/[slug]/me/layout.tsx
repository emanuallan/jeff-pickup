import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { ORG_PUBLIC_CONTENT_MAX } from '@/lib/org-public-layout'
import { accentOnDark } from '@/lib/colors'
import { OrgPublicBackdrop } from '../_components/org-public-backdrop'
import { OrgHeader } from '../_components/org-header'
import { OrgPublicSiteFooter } from '../_components/org-public-site-footer'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function MeLayout({ children, params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const accent = org.branding.accent_color
  const accentSoft = accentOnDark(accent)

  return (
    <>
      <OrgPublicBackdrop accent={accent} />
      <main
        className={`mx-auto min-h-dvh px-5 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 ${ORG_PUBLIC_CONTENT_MAX}`}
      >
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: accentSoft }}
          >
            ← Back to sessions
          </Link>
        </div>
        <OrgHeader
          org={org}
          title="You"
          eyebrow={org.name}
          subtitle="Your stats and profile in this group"
          logoPriority
        />
        <div className="mt-8">{children}</div>
        <OrgPublicSiteFooter
          slug={slug}
          orgName={org.name}
          accent={accent}
          showSponsorshipCta={false}
          showPoweredByOnMobile
        />
      </main>
    </>
  )
}
