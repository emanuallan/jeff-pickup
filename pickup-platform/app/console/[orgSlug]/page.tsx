import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg } from '@/lib/schedules'
import { getUpcomingEventsForConsole, getPastEventsForConsole } from '@/lib/events'
import { getParticipantHistoryForOrg } from '@/lib/participants'
import { orgBaseUrl } from '@/lib/og-metadata'
import { OrgConsoleHeader } from './org-console-header'
import {
  IconSessions,
  IconPastSessions,
  IconLocation,
  IconSchedule,
  IconBranding,
  IconParticipants,
  IconSetup,
} from './console-nav-icons'
import { ConsolePage, ConsoleNavGrid, ConsoleNavTile } from '../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function formatCount(n: number, singular: string, plural?: string) {
  if (n === 0) return 'None yet'
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`
}

export default async function OrgConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, schedules, upcomingEvents, pastEvents, participants] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
    getUpcomingEventsForConsole(org.id),
    getPastEventsForConsole(org.id),
    getParticipantHistoryForOrg(org.id),
  ])

  const orgUrl = orgBaseUrl(org.slug)
  const isSetup = locations.length > 0 && schedules.length > 0
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
        orgActivity={org.activity || null}
        logoUrl={org.branding.logo_url}
        publicUrl={orgUrl}
      />

      {!isSetup ? (
        <div className="mt-6 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
          <p className="text-sm font-medium text-indigo-200">Finish setup to go live</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Add a location and recurring schedule — sessions appear automatically.
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
          {!isSetup ? (
            <ConsoleNavTile
              href={`${base}/setup`}
              title="Get started"
              icon={<IconSetup />}
              badge="Setup"
            />
          ) : null}
          <ConsoleNavTile
            href={`${base}/sessions`}
            title="Sessions"
            icon={<IconSessions />}
            badge={formatCount(upcomingEvents.length, 'upcoming')}
          />
          <ConsoleNavTile
            href={`${base}/sessions/past`}
            title="Past sessions"
            icon={<IconPastSessions />}
            badge={formatCount(pastEvents.length, 'session')}
          />
          <ConsoleNavTile
            href={`${base}/locations`}
            title="Locations"
            icon={<IconLocation />}
            badge={formatCount(locations.length, 'location')}
          />
          <ConsoleNavTile
            href={`${base}/schedules`}
            title="Schedules"
            icon={<IconSchedule />}
            badge={formatCount(schedules.length, 'schedule')}
          />
          <ConsoleNavTile
            href={`${base}/settings`}
            title="Branding"
            icon={<IconBranding />}
          />
          <ConsoleNavTile
            href={`${base}/participants`}
            title="Participants"
            icon={<IconParticipants />}
            badge={formatCount(participants.length, 'person', 'people')}
          />
        </ConsoleNavGrid>
      </div>
    </ConsolePage>
  )
}
