'use client'

import {
  DetailList,
  DetailRow,
  LazyAnalyticsStatCard,
} from './lazy-analytics-stat-card'
import type {
  AllTimeSignupPerson,
  ArrivalStatusRow,
  CapacityDetail,
  GuestCarrier,
  PageViewsDetail,
  SignupFunnelDetail,
  SignupTimelineEvent,
} from '@/lib/event-analytics-details.types'

type BaseProps = {
  orgSlug: string
  eventId: string
}

export function PageViewsStatCard({
  orgSlug,
  eventId,
  count,
}: BaseProps & { count: number }) {
  return (
    <LazyAnalyticsStatCard<PageViewsDetail>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="page-views"
      disabled={count === 0}
      value={String(count)}
      label="Page views"
      hint="Total page loads"
      interactiveHint="Tap for daily breakdown"
      sheetTitle={`Page views (${count})`}
      sheetDescription="Views grouped by day, plus repeat visit patterns."
      sheetTitleId="page-views-sheet-title"
      hasContent={(data) => data.days.length > 0}
      emptyMessage="No page views recorded yet."
    >
      {(data) => (
        <DetailList>
          {data.days.map((day) => (
            <DetailRow key={day.label} title={day.label} meta={`${day.viewCount} views`} />
          ))}
          {data.repeatViews > 0 ? (
            <DetailRow
              title="Repeat page loads"
              meta={`${data.repeatViews} reload${data.repeatViews === 1 ? '' : 's'} from returning browsers`}
            />
          ) : null}
          {data.avgViewsPerVisitor != null ? (
            <DetailRow
              title="Avg views per visitor"
              meta={`${data.avgViewsPerVisitor} per unique browser`}
            />
          ) : null}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function SignupRateStatCard({
  orgSlug,
  eventId,
  rate,
  capped,
  hasTraffic,
  hint,
}: BaseProps & {
  rate: string
  capped: boolean
  hasTraffic: boolean
  hint?: string
}) {
  return (
    <LazyAnalyticsStatCard<SignupFunnelDetail>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="signup-funnel"
      disabled={!hasTraffic}
      value={rate}
      label="Sign-up rate"
      hint={hint}
      interactiveHint="Tap for funnel details"
      sheetTitle="Sign-up funnel"
      sheetDescription="Extra context behind the conversion rate."
      sheetTitleId="signup-funnel-sheet-title"
      hasContent={(data) =>
        data.rejoinEvents > 0 ||
        data.rejoinPeople > 0 ||
        data.repeatPageLoads > 0 ||
        data.conversionNote != null
      }
      emptyMessage="Not enough traffic yet for funnel details."
    >
      {(data) => (
        <DetailList>
          {data.repeatPageLoads > 0 ? (
            <DetailRow
              title="Repeat page loads"
              meta={`${data.repeatPageLoads} extra view${data.repeatPageLoads === 1 ? '' : 's'} beyond first visits`}
            />
          ) : null}
          {data.rejoinPeople > 0 ? (
            <DetailRow
              title="Re-joined after leaving"
              meta={`${data.rejoinPeople} people · ${data.rejoinEvents} extra join${data.rejoinEvents === 1 ? '' : 's'}`}
            />
          ) : null}
          {data.conversionNote ? (
            <DetailRow title="Shared devices" meta={data.conversionNote} />
          ) : capped ? (
            <DetailRow
              title="Shared devices"
              meta="More people signed up than unique browsers — likely shared devices."
            />
          ) : null}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function AllTimeSignupsStatCard({
  orgSlug,
  eventId,
  count,
}: BaseProps & { count: number }) {
  return (
    <LazyAnalyticsStatCard<AllTimeSignupPerson[]>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="all-time-signups"
      disabled={count === 0}
      value={String(count)}
      label="All-time sign-ups"
      hint="Unique people who joined"
      interactiveHint="Tap to see everyone who joined"
      sheetTitle={`All-time sign-ups (${count})`}
      sheetDescription="Everyone who joined at least once, including people no longer on the roster."
      sheetTitleId="all-time-signups-sheet-title"
      hasContent={(data) => data.length > 0}
    >
      {(people) => (
        <DetailList>
          {people.map((person) => (
            <DetailRow
              key={person.participantId}
              title={person.displayName}
              subtitle={`${person.firstName} ${person.lastName} · ${person.phone}`}
              meta={
                person.status === 'on_roster'
                  ? 'Currently on roster'
                  : 'No longer on roster'
              }
            />
          ))}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function CurrentSignupsStatCard({
  orgSlug,
  eventId,
  count,
  headcountHint,
}: BaseProps & { count: number; headcountHint: string }) {
  return (
    <LazyAnalyticsStatCard<ArrivalStatusRow[]>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="arrival-status"
      disabled={count === 0}
      value={String(count)}
      label="Currently signed up"
      hint={headcountHint}
      interactiveHint="Tap for arrival status breakdown"
      sheetTitle={`Currently signed up (${count})`}
      sheetDescription="How people on the roster have marked their arrival status."
      sheetTitleId="arrival-status-sheet-title"
      hasContent={(data) => data.length > 0}
    >
      {(rows) => (
        <DetailList>
          {rows.map((row) => (
            <DetailRow
              key={row.status}
              title={`${row.emoji} ${row.label}`}
              meta={`${row.signupCount} signup${row.signupCount === 1 ? '' : 's'} · ${row.headcount} headcount`}
            />
          ))}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function GuestExtrasStatCard({
  orgSlug,
  eventId,
  count,
}: BaseProps & { count: number }) {
  return (
    <LazyAnalyticsStatCard<GuestCarrier[]>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="guest-carriers"
      disabled={count === 0}
      value={String(count)}
      label="Guests"
      hint="Extra people beyond sign-ups"
      interactiveHint="Tap to see who brought guests"
      sheetTitle={`Guest extras (${count})`}
      sheetDescription="Sign-ups who added extra people beyond themselves."
      sheetTitleId="guest-carriers-sheet-title"
      hasContent={(data) => data.length > 0}
    >
      {(carriers) => (
        <DetailList>
          {carriers.map((carrier) => (
            <DetailRow
              key={`${carrier.displayName}-${carrier.guestCount}`}
              title={carrier.displayName}
              subtitle={`${carrier.firstName} ${carrier.lastName}`}
              meta={`+${carrier.guestCount} guest${carrier.guestCount === 1 ? '' : 's'}`}
            />
          ))}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function CapacityFillStatCard({
  orgSlug,
  eventId,
  fill,
}: BaseProps & { fill: string }) {
  return (
    <LazyAnalyticsStatCard<CapacityDetail>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="capacity"
      value={fill}
      label="Capacity fill"
      interactiveHint="Tap for capacity details"
      sheetTitle="Capacity"
      sheetDescription="Spots and minimum player progress for this session."
      sheetTitleId="capacity-sheet-title"
    >
      {(data) => (
        <DetailList>
          {data.isOverCapacity ? (
            <DetailRow title="Over capacity" meta="Headcount exceeds the session limit." />
          ) : data.isFull ? (
            <DetailRow title="Session is full" meta="No spots remaining." />
          ) : (
            <DetailRow
              title="Spots remaining"
              meta={`${Math.max(0, data.spotsRemaining)} open spot${Math.abs(data.spotsRemaining) === 1 ? '' : 's'}`}
            />
          )}
          {data.minPlayers != null ? (
            <DetailRow
              title="Minimum players"
              meta={
                data.minMet
                  ? `Met · need ${data.minPlayers}`
                  : `Need ${data.needForMin} more · target ${data.minPlayers}`
              }
            />
          ) : null}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}

export function LastSignupStatCard({
  orgSlug,
  eventId,
  value,
  hasActivity,
}: BaseProps & { value: string; hasActivity: boolean }) {
  return (
    <LazyAnalyticsStatCard<SignupTimelineEvent[]>
      orgSlug={orgSlug}
      eventId={eventId}
      metric="signup-timeline"
      disabled={!hasActivity}
      value={value}
      label="Last sign-up"
      valueClassName="text-sm font-medium leading-snug"
      interactiveHint="Tap for sign-up activity"
      sheetTitle="Sign-up activity"
      sheetDescription="Join and leave events for this session, newest first."
      sheetTitleId="signup-timeline-sheet-title"
      hasContent={(data) => data.length > 0}
    >
      {(events) => (
        <DetailList>
          {events.map((event, index) => (
            <DetailRow
              key={`${event.at}-${event.displayName}-${index}`}
              title={`${event.displayName} ${event.action === 'joined' ? 'joined' : 'left'}`}
              subtitle={event.at}
            />
          ))}
        </DetailList>
      )}
    </LazyAnalyticsStatCard>
  )
}
