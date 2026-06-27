import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { orgEventsUrl } from '@/lib/og-metadata'
import { OrgConsoleHeader } from './org-console-header'
import { OrgConsoleNavFallback, OrgConsoleNavSection } from './org-console-nav'
import {
  OrgConsolePublicPageAction,
  OrgConsolePublicPageActionFallback,
} from './org-console-public-page-action'
import {
  OrgConsoleAnalyticsFallback,
} from './org-console-analytics'
import { OrgConsoleAnalyticsGate } from './org-console-analytics-gate'
import { ConsolePage } from '../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const orgUrl = orgEventsUrl(org.slug)

  return (
    <ConsolePage width="max-w-2xl">
      <Link
        href="/console"
        className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <span aria-hidden>←</span> All groups
      </Link>

      <OrgConsoleHeader
        orgName={org.name}
        orgDescription={org.description || null}
        logoUrl={org.branding.logo_url}
        action={
          <Suspense fallback={<OrgConsolePublicPageActionFallback />}>
            <OrgConsolePublicPageAction orgId={org.id} publicUrl={orgUrl} />
          </Suspense>
        }
      />

      <Suspense fallback={<OrgConsoleNavFallback base={`/console/${orgSlug}`} />}>
        <OrgConsoleNavSection orgId={org.id} orgSlug={orgSlug} />
      </Suspense>

      <Suspense fallback={<OrgConsoleAnalyticsFallback />}>
        <OrgConsoleAnalyticsGate orgId={org.id} />
      </Suspense>
    </ConsolePage>
  )
}
