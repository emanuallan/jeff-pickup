import Link from 'next/link'
import { getOrgConsoleNavCounts } from '@/lib/org-console-counts'
import { isOrgConsoleSetupComplete } from '@/lib/org-setup'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { orgFeatures } from '@/lib/org-features'
import { countRecentOrgSessionFeedback } from '@/lib/session-feedback.server'
import { countPendingSponsorships, getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'
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
  IconSponsorship,
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
  const supabase = await createClient()
  const [counts, org, recentFeedbackCount, pendingSponsorships, stripeAccount, { data: { user } }] =
    await Promise.all([
      getOrgConsoleNavCounts(orgId),
      getOrgForMember(orgSlug),
      countRecentOrgSessionFeedback(orgId),
      countPendingSponsorships(orgId),
      getOrgStripeAccount(orgId),
      supabase.auth.getUser(),
    ])
  const { data: membership } = user
    ? await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }
  const features = org ? orgFeatures(org) : null
  const isOwner = membership?.role === 'owner'
  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  const showPaymentsBanner =
    isOwner && isStripeConfigured() && !stripeReady
  const isSetup = isOrgConsoleSetupComplete({
    locationCount: counts.locationCount,
    scheduleCount: counts.scheduleCount,
    oneOffEventCount: counts.oneOffEventCount,
  })
  const base = `/console/${orgSlug}`
  const setupHref = `${base}/setup`
  const paymentsHref = `${base}/payments`
  /** Sections that need sessions to exist stay locked until setup completes. */
  const needsSessions = !isSetup
  const hasStripeAccount = Boolean(stripeAccount)
  const sponsorshipsLocked = needsSessions || !stripeReady
  const sponsorshipsHref = needsSessions
    ? setupHref
    : !stripeReady
      ? paymentsHref
      : `${base}/sponsorship`
  const sponsorshipsLockedHint = needsSessions
    ? 'Finish setup'
    : hasStripeAccount
      ? 'Finish payments'
      : 'Set up payments'

  return (
    <>
      {!isSetup ? (
        <div className="mt-6 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
          <p className="text-sm font-medium text-indigo-200">Get started</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Add a location and your first sessions — recurring or one-off. Locations, schedules,
            branding, and settings are available anytime.
          </p>
          <Link
            href={setupHref}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Continue setup
          </Link>
        </div>
      ) : null}

      {showPaymentsBanner ? (
        <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
          <p className="text-sm font-medium text-emerald-200">
            {hasStripeAccount ? 'Finish Stripe setup' : 'Collect payments'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {hasStripeAccount
              ? 'Complete Stripe Connect so you can charge session fees and offer sponsorships.'
              : 'Connect Stripe to charge session fees and unlock group sponsorships.'}
          </p>
          <Link
            href={paymentsHref}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {hasStripeAccount ? 'Continue setup' : 'Set up payments'}
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        <ConsoleNavGrid>
          <ConsoleNavTile
            href={needsSessions ? setupHref : `${base}/sessions`}
            title="Sessions"
            icon={<IconSessions />}
            badge={sessionsNavBadge(
              counts.liveSessionCount,
              counts.upcomingSessionCount,
              counts.activeCancelledSessionCount,
            )}
            live={counts.liveSessionCount > 0}
            locked={needsSessions}
            lockedHint="Finish setup"
          />
          <ConsoleNavTile
            href={needsSessions ? setupHref : `${base}/sessions/past`}
            title="Past sessions"
            icon={<IconPastSessions />}
            badge={pastSessionsNavBadge(
              counts.pastSessionCount,
              counts.pastCancelledSessionCount,
            )}
            locked={needsSessions}
            lockedHint="Finish setup"
          />
          <ConsoleNavTile
            href={`${base}/locations`}
            title="Locations"
            icon={<IconLocation />}
            badge={formatCount(counts.locationCount, 'location')}
          />
          <ConsoleNavTile
            href={`${base}/schedules`}
            title="Schedules"
            icon={<IconSchedule />}
            badge={formatCount(counts.scheduleCount, 'schedule')}
          />
          <ConsoleNavTile
            href={`${base}/branding`}
            title="Branding"
            icon={<IconBranding />}
          />
          {isOwner ? (
            <ConsoleNavTile
              href={sponsorshipsHref}
              title="Sponsorships"
              icon={<IconSponsorship />}
              badge={
                pendingSponsorships > 0
                  ? `${pendingSponsorships} pending`
                  : features?.group_sponsorships
                    ? 'Enabled'
                    : 'Set up'
              }
              locked={sponsorshipsLocked}
              lockedHint={sponsorshipsLockedHint}
            />
          ) : null}
          <ConsoleNavTile
            href={needsSessions ? setupHref : `${base}/participants`}
            title="Participants"
            icon={<IconParticipants />}
            badge={formatCount(counts.participantCount, 'person', 'people')}
            locked={needsSessions}
            lockedHint="Finish setup"
          />
          {features?.session_feedback ? (
            <ConsoleNavTile
              href={needsSessions ? setupHref : `${base}/feedback`}
              title="Feedback"
              icon={<IconFeedback />}
              badge={
                recentFeedbackCount > 0
                  ? `${recentFeedbackCount} recent`
                  : 'No feedback yet'
              }
              locked={needsSessions}
              lockedHint="Finish setup"
            />
          ) : null}
          <ConsoleNavTile
            href={`${base}/settings`}
            title="Settings"
            icon={<IconSettings />}
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
