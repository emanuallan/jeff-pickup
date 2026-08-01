import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef, formatEventTime, formatInstantInZone, statusLabel, isEventInProgress, isEventEnded, isEventCancelled } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'
import { getRosterWithContact, splitRosterByStatus } from '@/lib/signups'
import { formatGuestSuffix } from '@/lib/format-guest-suffix'
import { sessionTeamLabel, sessionTeamsEnabled, splitRosterByTeam } from '@/lib/session-team'
import { buildRosterAnalytics, fetchEventAnalyticsDb } from '@/lib/event-analytics'
import { arrivalStatusEmoji } from '@/lib/arrival-status'
import { orgBaseUrl } from '@/lib/og-metadata'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { arrowNe } from '@/lib/text-arrows'
import { formatPriceCents, isPaidSession } from '@/lib/session-payment'
import { getEventPaymentsForEvent } from '@/lib/session-payment.server'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import {
  ConsolePage,
  ConsoleHeader,
  ConsoleSection,
  ConsoleCard,
  Disclosure,
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
import { EventDebriefSection, shouldShowEventDebriefSection } from './event-debrief-section'
import {
  SessionPaymentsSection,
  paymentForSignup,
} from './session-payments-section'
import { SessionPaymentBadge } from './session-payment-badge'

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

  const paidSession = isPaidSession(event.price_cents)
  const [allRoster, dbAnalytics, payments, stripeAccount] = await Promise.all([
    getRosterWithContact(event.id),
    fetchEventAnalyticsDb(event.id),
    paidSession ? getEventPaymentsForEvent(event.id) : Promise.resolve([]),
    paidSession ? getOrgStripeAccount(org.id) : Promise.resolve(null),
  ])
  const { confirmed: roster, waitlisted } = splitRosterByStatus(allRoster)
  const analytics = buildRosterAnalytics(roster, event.capacity, dbAnalytics)
  const publicEventUrl = `${orgBaseUrl(orgSlug)}${orgPublicEventHref(event.short_id)}`
  const isLive = isEventInProgress(event) && event.status === 'on'
  const features = orgFeatures(org)
  const teamsOnSession = sessionTeamsEnabled(features.team_selection, event.team_count)
  const teamSplit = teamsOnSession
    ? splitRosterByTeam(roster, event.team_count!)
    : null
  const showFeedback =
    features.session_feedback && isEventEnded(event) && !isEventCancelled(event.status)
  const showDebrief =
    shouldShowEventDebriefSection(org, isEventEnded(event)) && !isEventCancelled(event.status)
  const hasSignupActivity = analytics.uniqueSignups > 0 || analytics.uniqueLeft > 0
  const hasTraffic = analytics.uniqueVisitors > 0 || analytics.uniqueSignups > 0
  const priceLabel = paidSession ? formatPriceCents(event.price_cents ?? 0) : null

  return (
    <ConsolePage>
      <ConsoleHeader
        title={formatEventTime(event)}
        live={isLive}
        description={event.location_label}
        backHref={`/console/${orgSlug}/sessions`}
        backLabel="Sessions"
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
        {priceLabel ? ` · ${priceLabel}/person` : ''}
      </p>

      <div className="mt-8 space-y-6">
        {paidSession && event.price_cents != null ? (
          <SessionPaymentsSection
            priceCents={event.price_cents}
            payments={payments}
            orgSlug={orgSlug}
            stripeReady={Boolean(stripeAccount?.charges_enabled)}
            timezone={event.timezone}
          />
        ) : null}

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
          ) : teamSplit ? (
            <div className="space-y-4">
              {teamSplit.teams.map((teamEntries, index) => (
                <div key={index + 1}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {sessionTeamLabel(index + 1)} ({teamEntries.length})
                  </p>
                  {teamEntries.length === 0 ? (
                    <p className="text-sm text-zinc-600">Empty</p>
                  ) : (
                    <ul className="space-y-2">
                      {teamEntries.map((e) => {
                        const payment = paidSession
                          ? paymentForSignup(payments, e.id, e.participant_id)
                          : null
                        return (
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
                              {payment ? (
                                <SessionPaymentBadge
                                  orgSlug={orgSlug}
                                  eventRef={eventId}
                                  paymentId={payment.id}
                                  signupId={e.id}
                                  participantName={e.display_name}
                                  amountCents={payment.amount_cents}
                                  status={payment.status}
                                />
                              ) : null}
                            </div>
                          </ConsoleCard>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
              {teamSplit.unassigned.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Unassigned ({teamSplit.unassigned.length})
                  </p>
                  <ul className="space-y-2">
                    {teamSplit.unassigned.map((e) => {
                      const payment = paidSession
                        ? paymentForSignup(payments, e.id, e.participant_id)
                        : null
                      return (
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
                            {payment ? (
                              <SessionPaymentBadge
                                orgSlug={orgSlug}
                                eventRef={eventId}
                                paymentId={payment.id}
                                signupId={e.id}
                                participantName={e.display_name}
                                amountCents={payment.amount_cents}
                                status={payment.status}
                              />
                            ) : null}
                          </div>
                        </ConsoleCard>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {roster.map((e) => {
                const payment = paidSession
                  ? paymentForSignup(payments, e.id, e.participant_id)
                  : null
                return (
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
                      {payment ? (
                        <SessionPaymentBadge
                          orgSlug={orgSlug}
                          eventRef={eventId}
                          paymentId={payment.id}
                          signupId={e.id}
                          participantName={e.display_name}
                          amountCents={payment.amount_cents}
                          status={payment.status}
                        />
                      ) : null}
                    </div>
                  </ConsoleCard>
                )
              })}
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

        <Disclosure summary="Engagement stats">
          <p className="mb-4 text-xs text-zinc-500">
            Traffic and sign-up funnel for this session.
          </p>
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
        </Disclosure>

        {showDebrief ? (
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
            }
          >
            <EventDebriefSection orgId={org.id} eventId={event.id} />
          </Suspense>
        ) : null}

        {showFeedback ? (
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
            }
          >
            <EventFeedbackSection orgSlug={orgSlug} orgId={org.id} eventId={event.id} />
          </Suspense>
        ) : null}
      </div>
    </ConsolePage>
  )
}
