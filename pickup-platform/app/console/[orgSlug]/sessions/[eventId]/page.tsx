import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef, formatEventTime, formatInstantInZone, statusLabel, isEventInProgress, isEventEnded, isEventCancelled } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'
import { getRosterWithContact, splitRosterByStatus } from '@/lib/signups'
import { formatGuestSuffix } from '@/lib/format-guest-suffix'
import { buildRosterAnalytics, fetchEventAnalyticsDb } from '@/lib/event-analytics'
import { arrivalStatusEmoji } from '@/lib/arrival-status'
import { orgBaseUrl } from '@/lib/og-metadata'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { arrowNe } from '@/lib/text-arrows'
import {
  ConsolePage,
  ConsoleHeader,
  ConsoleSection,
  ConsoleCard,
  btnOutline,
} from '../../../_components/console-ui'
import { UnregisteredStatCard } from './unregistered-stat-card'
import { UniqueVisitorsStatCard } from './unique-visitors-stat-card'
import {
  AllTimeSignupsStatCard,
  CapacityFillStatCard,
  CurrentSignupsStatCard,
  GuestExtrasStatCard,
  LastSignupStatCard,
  PageViewsStatCard,
  SignupRateStatCard,
} from './event-analytics-stat-cards'
import { EventFeedbackSection } from './event-feedback-section'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

export default async function ConsoleEventAnalyticsPage({ params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    notFound()
  }

  const [allRoster, dbAnalytics] = await Promise.all([
    getRosterWithContact(event.id),
    fetchEventAnalyticsDb(event.id),
  ])
  const { confirmed: roster, waitlisted } = splitRosterByStatus(allRoster)
  const analytics = buildRosterAnalytics(roster, event.capacity, dbAnalytics)
  const publicEventUrl = `${orgBaseUrl(orgSlug)}${orgPublicEventHref(event.short_id)}`
  const isLive = isEventInProgress(event) && event.status === 'on'
  const showFeedback =
    orgFeatures(org).session_feedback && isEventEnded(event) && !isEventCancelled(event.status)
  const hasSignupActivity = analytics.uniqueSignups > 0 || analytics.uniqueLeft > 0
  const hasTraffic = analytics.uniqueVisitors > 0 || analytics.uniqueSignups > 0

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title={formatEventTime(event)}
        live={isLive}
        description={event.location_label}
        backHref={`/console/${orgSlug}/sessions`}
        backLabel="Back"
        useHistoryBack
        actions={
          <>
            <Link href={`/console/${orgSlug}/sessions/${eventId}/edit`} className={btnOutline}>
              Edit roster
            </Link>
            <a href={publicEventUrl} target="_blank" rel="noreferrer" className={btnOutline}>
              View public session {arrowNe}
            </a>
          </>
        }
      />
      <p className="mt-2 text-xs text-zinc-500">
        {statusLabel(event.status)} · {analytics.headcount}
        {event.capacity != null ? ` / ${event.capacity}` : ''} coming
        {event.min_players != null ? ` · min ${event.min_players} participants` : ''}
      </p>

      <div className="mt-8 space-y-6">
        <ConsoleSection title="Engagement" description="Traffic and sign-up funnel for this session.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PageViewsStatCard orgSlug={orgSlug} eventId={eventId} count={analytics.pageViews} />
            <UniqueVisitorsStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              count={analytics.uniqueVisitors}
            />
            <SignupRateStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              rate={analytics.conversionRate != null ? `${analytics.conversionRate}%` : '—'}
              capped={analytics.conversionCapped}
              hasTraffic={hasTraffic}
              hint={
                analytics.uniqueSignups > 0
                  ? analytics.conversionCapped
                    ? `${analytics.uniqueSignups} signed up · shared device`
                    : `${analytics.uniqueSignups} signed up`
                  : analytics.uniqueVisitors > 0
                    ? 'No sign-ups yet'
                    : 'Needs page views'
              }
            />
            <AllTimeSignupsStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              count={analytics.uniqueSignups}
            />
            <CurrentSignupsStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              count={analytics.currentSignups}
              headcountHint={`${analytics.headcount} total headcount`}
            />
            <UnregisteredStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              count={analytics.uniqueLeft}
              timezone={event.timezone}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <GuestExtrasStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              count={analytics.totalGuests}
            />
            {event.capacity != null ? (
              <CapacityFillStatCard
                orgSlug={orgSlug}
                eventId={eventId}
                fill={analytics.capacityFill != null ? `${analytics.capacityFill}%` : '—'}
              />
            ) : (
              <ConsoleCard className="flex flex-col gap-1">
                <div className="tabular-nums text-2xl font-semibold text-zinc-50">No limit</div>
                <div className="text-xs font-medium text-zinc-400">Capacity</div>
              </ConsoleCard>
            )}
            <LastSignupStatCard
              orgSlug={orgSlug}
              eventId={eventId}
              value={
                analytics.lastSignupAt
                  ? formatInstantInZone(analytics.lastSignupAt, event.timezone)
                  : '—'
              }
              hasActivity={hasSignupActivity}
            />
          </div>
        </ConsoleSection>

        <ConsoleSection
          title={`Roster (${roster.length})`}
          action={
            allRoster.length > 0 ? (
              <a
                href={`/api/console/${orgSlug}/events/${eventId}/roster`}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Export CSV
              </a>
            ) : undefined
          }
        >
          {roster.length === 0 ? (
            <p className="text-sm text-zinc-500">No sign-ups yet.</p>
          ) : (
            <ul className="space-y-2">
              {roster.map((e) => (
                <ConsoleCard key={e.id} className="min-w-0 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-medium text-zinc-100">
                        {arrivalStatusEmoji(e.arrival_status, event.location_is_online)}{' '}
                        {e.display_name}
                        {formatGuestSuffix(e.guest_count)}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {e.first_name} {e.last_name} · {e.phone}
                      </div>
                    </div>
                  </div>
                </ConsoleCard>
              ))}
            </ul>
          )}

          {event.capacity != null && waitlisted.length > 0 ? (
            <details className="mt-4 group">
              <summary className="cursor-pointer list-none text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-400 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block transition-transform group-open:rotate-90">›</span>
                  Waitlist ({waitlisted.length})
                </span>
              </summary>
              <ul className="mt-3 space-y-2">
                {waitlisted.map((e, index) => (
                  <ConsoleCard key={e.id} className="min-w-0 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words font-medium text-zinc-100">
                          <span className="mr-1 text-zinc-500">#{index + 1}</span>
                          {e.display_name}
                          {formatGuestSuffix(e.guest_count)}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {e.first_name} {e.last_name} · {e.phone}
                        </div>
                      </div>
                    </div>
                  </ConsoleCard>
                ))}
              </ul>
            </details>
          ) : null}
        </ConsoleSection>

        {showFeedback ? (
          <EventFeedbackSection orgSlug={orgSlug} orgId={org.id} eventId={event.id} />
        ) : null}
      </div>
    </ConsolePage>
  )
}
