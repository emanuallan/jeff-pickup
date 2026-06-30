import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicOrgPastSessionCount } from '@/lib/public-data'
import { HIDDEN_ORG_NAV_BASE } from '@/lib/org-public-nav'
import { resolveOrgPublicNavItems } from '@/lib/org-public-nav.server'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import { OrgPublicNav } from './_components/org-public-nav'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function HiddenOrgLayout({ children, params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const pastSessionCount = await getPublicOrgPastSessionCount(org.id)
  const navItems = resolveOrgPublicNavItems({ org, pastSessionCount }, HIDDEN_ORG_NAV_BASE)

  return (
    <OrgPageShell className="pb-24 md:pb-10">
      <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-center text-xs text-amber-200/90">
        Preview shell at <span className="font-medium">/hidden</span> — not linked publicly
      </p>

      <OrgHeader
        org={org}
        title={org.name}
        subtitle={org.description}
        logoPriority
        className="mt-4"
      />

      <OrgPublicNav
        items={navItems}
        accent={org.branding.accent_color}
        basePath={HIDDEN_ORG_NAV_BASE}
      />

      <div className="mt-8">{children}</div>

      <OrgPageFooter slug={org.slug} links={org.branding.links} />
    </OrgPageShell>
  )
}
