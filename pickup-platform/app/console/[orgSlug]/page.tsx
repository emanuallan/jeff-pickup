import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getOrgConsoleNavCounts } from '@/lib/org-console-counts'
import { orgEventsUrl } from '@/lib/og-metadata'
import { isOrgConsoleSetupComplete } from '@/lib/org-setup'
import { OrgConsoleHeader } from './org-console-header'
import {
  OrgConsoleAnalyticsFallback,
  OrgConsoleAnalyticsSection,
} from './org-console-analytics'
import {
  IconSessions,
  IconPastSessions,
  IconLocation,
  IconSchedule,
  IconBranding,
  IconParticipants,
} from './console-nav-icons'
import { ConsolePage, ConsoleNavGrid, ConsoleNavTile } from '../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function formatCount(n: number, singular: string, plural?: string) {
  if (n === 0) return 'None yet'
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`
}

function pastSessionsNavBadge(sessionCount: number, cancelledCount: number) {
  if (sessionCount === 0 && cancelledCount === 0) {
    return 'None yet'
  }

  return (
    <div className="space-y-0.5">
      <div>{`${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`}</div>
      {cancelledCount > 0 ? <div>{`${cancelledCount} cancelled`}</div> : null}
    </div>
  )
}

function sessionsNavBadge(liveCount: number, upcomingCount: number) {
  if (liveCount > 0) {
    return (
      <div className="space-y-0.5">
        <div className="font-medium text-red-400">{formatCount(liveCount, 'live')}</div>
        <div>{`${upcomingCount} upcoming`}</div>
      </div>
    )
  }

  return formatCount(upcomingCount, 'upcoming')
}

export default async function OrgConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const counts = await getOrgConsoleNavCounts(org.id)

  const orgUrl = orgEventsUrl(org.slug)
  const isSetup = isOrgConsoleSetupComplete({
    locationCount: counts.locationCount,
    scheduleCount: counts.scheduleCount,
    oneOffEventCount: counts.oneOffEventCount,
  })
  const base = `/console/${orgSlug}`

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
        publicUrl={orgUrl}
        publicPageDisabled={!isSetup}
      />

      {!isSetup ? (
        <div className="mt-6 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
          <p className="text-sm font-medium text-indigo-200">Get started</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Add a location and your first sessions — recurring or one-off.
          </p>
          <Link
            href={`${base}/setup`}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Continue setup
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        <ConsoleNavGrid>
          <ConsoleNavTile
            href={`${base}/sessions`}
            title="Sessions"
            icon={<IconSessions />}
            badge={sessionsNavBadge(counts.liveSessionCount, counts.upcomingSessionCount)}
            live={counts.liveSessionCount > 0}
            disabled={!isSetup}
          />
          <ConsoleNavTile
            href={`${base}/sessions/past`}
            title="Past sessions"
            icon={<IconPastSessions />}
            badge={pastSessionsNavBadge(
              counts.pastSessionCount,
              counts.pastCancelledSessionCount,
            )}
            disabled={!isSetup}
          />
          <ConsoleNavTile
            href={`${base}/locations`}
            title="Locations"
            icon={<IconLocation />}
            badge={formatCount(counts.locationCount, 'location')}
            disabled={!isSetup}
          />
          <ConsoleNavTile
            href={`${base}/schedules`}
            title="Schedules"
            icon={<IconSchedule />}
            badge={formatCount(counts.scheduleCount, 'schedule')}
            disabled={!isSetup}
          />
          <ConsoleNavTile
            href={`${base}/settings`}
            title="Branding"
            icon={<IconBranding />}
            disabled={!isSetup}
          />
          <ConsoleNavTile
            href={`${base}/participants`}
            title="Participants"
            icon={<IconParticipants />}
            badge={formatCount(counts.participantCount, 'person', 'people')}
            disabled={!isSetup}
          />
        </ConsoleNavGrid>
      </div>

      {counts.pastSessionCount > 0 ? (
        <Suspense fallback={<OrgConsoleAnalyticsFallback />}>
          <OrgConsoleAnalyticsSection orgId={org.id} />
        </Suspense>
      ) : null}
    </ConsolePage>
  )
}
