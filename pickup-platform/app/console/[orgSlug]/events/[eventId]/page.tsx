import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventById, formatEventTime, statusLabel } from '@/lib/events'
import { getRosterWithContact } from '@/lib/signups'
import { getEventAnalytics } from '@/lib/event-analytics'
import { arrivalStatusEmoji } from '@/lib/arrival-status'
import { orgBaseUrl } from '@/lib/og-metadata'
import {
  ConsolePage,
  ConsoleHeader,
  ConsoleSection,
  ConsoleCard,
  btnOutline,
} from '../../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <ConsoleCard className="flex flex-col gap-1">
      <div className="text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
      <div className="text-xs font-medium text-zinc-400">{label}</div>
      {hint ? <div className="text-[11px] text-zinc-600">{hint}</div> : null}
    </ConsoleCard>
  )
}

export default async function ConsoleEventAnalyticsPage({ params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const event = await getEventById(eventId, org.id)
  if (!event) {
    notFound()
  }

  const roster = await getRosterWithContact(eventId)
  const analytics = await getEventAnalytics(eventId, roster, event.capacity)
  const publicEventUrl = `${orgBaseUrl(orgSlug)}/events/${eventId}`

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title={formatEventTime(event)}
        description={event.location_label}
        backHref={`/console/${orgSlug}`}
        backLabel={org.name}
        actions={
          <a href={publicEventUrl} target="_blank" rel="noreferrer" className={btnOutline}>
            View public event ↗
          </a>
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
            <StatCard label="Page views" value={String(analytics.pageViews)} />
            <StatCard label="Unique visitors" value={String(analytics.uniqueVisitors)} />
            <StatCard
              label="Sign-up rate"
              value={analytics.conversionRate != null ? `${analytics.conversionRate}%` : '—'}
              hint={
                analytics.uniqueVisitors > 0
                  ? `${analytics.uniqueSignups} signed up`
                  : 'Needs page views'
              }
            />
            <StatCard
              label="All-time sign-ups"
              value={String(analytics.uniqueSignups)}
              hint="Unique people who joined"
            />
            <StatCard
              label="Currently signed up"
              value={String(analytics.currentSignups)}
              hint={`${analytics.headcount} total headcount`}
            />
            <StatCard
              label="Unregistered"
              value={String(analytics.uniqueLeft)}
              hint="Unique people who left"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Guests"
              value={String(analytics.totalGuests)}
              hint="Extra people beyond sign-ups"
            />
            {event.capacity != null ? (
              <StatCard
                label="Capacity fill"
                value={analytics.capacityFill != null ? `${analytics.capacityFill}%` : '—'}
                hint={`${analytics.headcount} of ${event.capacity}`}
              />
            ) : (
              <StatCard label="Capacity" value="No limit" />
            )}
            <StatCard
              label="Last sign-up"
              value={
                analytics.lastSignupAt
                  ? new Date(analytics.lastSignupAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'
              }
              hint={
                analytics.firstSignupAt
                  ? `First: ${new Date(analytics.firstSignupAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : undefined
              }
            />
          </div>
        </ConsoleSection>

        <ConsoleSection
          title={`Roster (${roster.length})`}
          action={
            roster.length > 0 ? (
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
                <ConsoleCard key={e.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-zinc-100">
                        {arrivalStatusEmoji(e.arrival_status, event.location_is_online)}{' '}
                        {e.display_name}
                        {e.guest_count > 0 ? ` +${e.guest_count}` : ''}
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
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
