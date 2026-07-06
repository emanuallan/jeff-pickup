import Link from 'next/link'
import { getOrgConsoleNavCounts } from '@/lib/org-console-counts'
import { isOrgConsoleSetupComplete } from '@/lib/org-setup'
import { getOrgForMember } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
import { countRecentOrgSessionFeedback } from '@/lib/session-feedback.server'
import { ConsoleNavGrid, ConsoleNavTile } from '../_components/console-ui'
import {
  IconSessions,
  IconPastSessions,
  IconLocation,
  IconSchedule,
  IconBranding,
  IconSettings,
  IconParticipants,
  IconFeedback,
} from './console-nav-icons'

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

function sessionsNavBadge(
  liveCount: number,
  upcomingCount: number,
  cancelledCount: number,
) {
  if (liveCount === 0 && upcomingCount === 0 && cancelledCount === 0) {
    return 'None yet'
  }

  return (
    <div className="space-y-0.5">
      {liveCount > 0 ? (
        <div className="font-medium text-red-400">{formatCount(liveCount, 'live')}</div>
      ) : null}
      <div>{`${upcomingCount} upcoming`}</div>
      {cancelledCount > 0 ? <div>{`${cancelledCount} cancelled`}</div> : null}
    </div>
  )
}

const badgeSkeleton = (
  <span className="inline-block h-3 w-14 animate-pulse rounded bg-zinc-800/80" aria-hidden />
)

/** Nav grid with placeholder badges — links work immediately while counts stream in. */
export function OrgConsoleNavFallback({ base }: { base: string }) {
  return (
    <div className="mt-8">
      <ConsoleNavGrid>
        <ConsoleNavTile href={`${base}/sessions`} title="Sessions" icon={<IconSessions />} badge={badgeSkeleton} />
        <ConsoleNavTile href={`${base}/sessions/past`} title="Past sessions" icon={<IconPastSessions />} badge={badgeSkeleton} />
        <ConsoleNavTile href={`${base}/locations`} title="Locations" icon={<IconLocation />} badge={badgeSkeleton} />
        <ConsoleNavTile href={`${base}/schedules`} title="Schedules" icon={<IconSchedule />} badge={badgeSkeleton} />
        <ConsoleNavTile href={`${base}/branding`} title="Branding" icon={<IconBranding />} />
        <ConsoleNavTile href={`${base}/participants`} title="Participants" icon={<IconParticipants />} badge={badgeSkeleton} />
        <ConsoleNavTile href={`${base}/settings`} title="Settings" icon={<IconSettings />} />
      </ConsoleNavGrid>
    </div>
  )
}

type NavSectionProps = {
  orgId: string
  orgSlug: string
}

/** Fetches hub counts off the critical path — badges, setup gating, and get-started banner. */
export async function OrgConsoleNavSection({ orgId, orgSlug }: NavSectionProps) {
  const [counts, org, recentFeedbackCount] = await Promise.all([
    getOrgConsoleNavCounts(orgId),
    getOrgForMember(orgSlug),
    countRecentOrgSessionFeedback(orgId),
  ])
  const features = org ? orgFeatures(org) : null
  const isSetup = isOrgConsoleSetupComplete({
    locationCount: counts.locationCount,
    scheduleCount: counts.scheduleCount,
    oneOffEventCount: counts.oneOffEventCount,
  })
  const base = `/console/${orgSlug}`

  return (
    <>
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
            badge={sessionsNavBadge(
              counts.liveSessionCount,
              counts.upcomingSessionCount,
              counts.activeCancelledSessionCount,
            )}
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
            href={`${base}/branding`}
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
          {features?.session_feedback ? (
            <ConsoleNavTile
              href={`${base}/feedback`}
              title="Feedback"
              icon={<IconFeedback />}
              badge={
                recentFeedbackCount > 0
                  ? `${recentFeedbackCount} recent`
                  : 'No feedback yet'
              }
              disabled={!isSetup}
            />
          ) : null}
          <ConsoleNavTile
            href={`${base}/settings`}
            title="Settings"
            icon={<IconSettings />}
            disabled={!isSetup}
          />
        </ConsoleNavGrid>
      </div>
    </>
  )
}

/** Whether setup is complete — used to gate the public page link in the header. */
export async function isOrgConsoleHubSetupComplete(orgId: string): Promise<boolean> {
  const counts = await getOrgConsoleNavCounts(orgId)
  return isOrgConsoleSetupComplete({
    locationCount: counts.locationCount,
    scheduleCount: counts.scheduleCount,
    oneOffEventCount: counts.oneOffEventCount,
  })
}
