import { ConsoleCard, ConsoleSection } from '../_components/console-ui'
import { getOrgAnalytics } from '@/lib/org-analytics'
import type { OrgAnalytics } from '@/lib/org-analytics'

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <ConsoleCard className="flex min-h-[4.5rem] flex-col justify-center gap-1">
      <div className="text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
      <div className="text-xs font-medium text-zinc-400">{label}</div>
      {hint ? <div className="text-[11px] leading-snug text-zinc-600">{hint}</div> : null}
    </ConsoleCard>
  )
}

type Props = {
  analytics: OrgAnalytics
  participantCount: number
  regularCount: number
}

export function OrgConsoleAnalytics({ analytics, participantCount, regularCount }: Props) {
  const hasData =
    analytics.pageViews > 0 ||
    analytics.uniqueSignups > 0 ||
    analytics.pastSessions > 0 ||
    participantCount > 0

  if (!hasData) {
    return (
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          At a glance
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Stats will appear once people visit your public pages and join sessions.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-10">
      <ConsoleSection
        title="At a glance"
        description="All-time stats across your public pages and sessions."
      >
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Participants"
            value={String(participantCount)}
            hint={
              regularCount > 0
                ? `${regularCount} regular${regularCount === 1 ? '' : 's'} (2+ sessions)`
                : participantCount > 0
                  ? 'Signed up at least once'
                  : undefined
            }
          />
          <StatCard
            label="Past sessions"
            value={String(analytics.pastSessions)}
            hint={
              analytics.avgAttendance != null
                ? `~${analytics.avgAttendance} avg attendance`
                : 'None completed yet'
            }
          />
          <StatCard
            label="Active sign-ups"
            value={String(analytics.activeSignups)}
            hint="Headcount on upcoming sessions"
          />
          <StatCard
            label="Page views"
            value={String(analytics.pageViews)}
            hint={`${analytics.uniqueVisitors} unique visitor${analytics.uniqueVisitors === 1 ? '' : 's'}`}
          />
          <StatCard
            label="Sign-up rate"
            value={analytics.conversionRate != null ? `${analytics.conversionRate}%` : '—'}
            hint={
              analytics.uniqueSignups > 0
                ? analytics.conversionCapped
                  ? `${analytics.uniqueSignups} joined · shared devices`
                  : `${analytics.uniqueSignups} joined all-time`
                : analytics.uniqueVisitors > 0
                  ? 'No sign-ups yet'
                  : 'Needs page traffic'
            }
          />
          <StatCard
            label="Top attendee"
            value={analytics.topAttendee ? String(analytics.topAttendee.caps) : '—'}
            hint={
              analytics.topAttendee
                ? `${analytics.topAttendee.name} · sessions attended`
                : 'Needs past sessions'
            }
          />
        </div>
      </ConsoleSection>
    </section>
  )
}

export function OrgConsoleAnalyticsFallback() {
  return (
    <section className="mt-10" aria-busy="true" aria-label="Loading analytics">
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
      <div className="mt-1 h-3 w-56 max-w-full animate-pulse rounded bg-zinc-800/70" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ConsoleCard key={i} className="flex min-h-[4.5rem] flex-col justify-center gap-2">
            <div className="h-7 w-12 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/80" />
          </ConsoleCard>
        ))}
      </div>
    </section>
  )
}

/** Fetches org-wide analytics off the critical path (wrapped in Suspense on the hub page). */
export async function OrgConsoleAnalyticsSection({
  orgId,
  participantCount,
  regularCount,
}: {
  orgId: string
  participantCount: number
  regularCount: number
}) {
  const analytics = await getOrgAnalytics(orgId)
  return (
    <OrgConsoleAnalytics
      analytics={analytics}
      participantCount={participantCount}
      regularCount={regularCount}
    />
  )
}
