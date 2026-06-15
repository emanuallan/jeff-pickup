import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg, formatWeekdays, formatTime } from '@/lib/schedules'
import {
  getUpcomingEventsForConsole,
  getPastEventsForConsole,
  formatEventTime,
  statusLabel,
  type EventWithLocation,
} from '@/lib/events'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  cancelEvent,
  createLocation,
  createOneOffEvent,
  createSchedule,
} from '../actions'
import { ScheduleForm } from './schedule-form'
import { DeleteLocationButton } from './delete-location-button'
import { DeleteEventButton } from './delete-event-button'
import { OneOffEventForm } from './one-off-event-form'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, schedules, upcomingEvents, pastEvents] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
    getUpcomingEventsForConsole(org.id),
    getPastEventsForConsole(org.id),
  ])

  const rootDomain = getRootDomain()
  const orgUrl =
    process.env.NODE_ENV === 'development'
      ? `http://${org.slug}.localhost:3000`
      : `https://${org.slug}.${rootDomain}`

  const addLocation = createLocation.bind(null, orgSlug)

  const hasLocation = locations.length > 0
  const hasSchedule = schedules.length > 0
  const isSetup = hasLocation && hasSchedule

  const locationList =
    locations.length > 0 ? (
      <ul className="space-y-2">
        {locations.map((loc) => (
          <li
            key={loc.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{loc.label}</div>
                {loc.address ? (
                  <div className="mt-0.5 text-xs text-zinc-500">{loc.address}</div>
                ) : null}
              </div>
              <DeleteLocationButton
                orgSlug={orgSlug}
                locationId={loc.id}
                locationLabel={loc.label}
              />
            </div>
          </li>
        ))}
      </ul>
    ) : null

  const addLocationForm = (
    <form action={addLocation} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-medium text-zinc-400">Add location</p>
      <input
        name="label"
        required
        placeholder="Park name"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        name="address"
        placeholder="Street address (optional)"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        name="maps_url"
        placeholder="Google Maps link (optional)"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add location
      </button>
    </form>
  )

  const scheduleList =
    schedules.length > 0 ? (
      <ul className="space-y-2">
        {schedules.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
          >
            <div className="font-medium">{s.title}</div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {formatWeekdays(s.byweekday)} · {formatTime(s.start_time)} · {s.timezone}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {s.capacity ? `Capacity ${s.capacity}` : 'No capacity limit'} · min {s.min_players}
            </div>
          </li>
        ))}
      </ul>
    ) : null

  const scheduleForm = (
    <ScheduleForm orgSlug={orgSlug} locations={locations} createSchedule={createSchedule} />
  )

  const renderEventItem = (ev: EventWithLocation, opts?: { past?: boolean }) => (
    <li
      key={ev.id}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{formatEventTime(ev)}</div>
          <div className="mt-0.5 text-xs text-zinc-500">{ev.location_label}</div>
        </div>
        <span
          className={
            ev.status === 'cancelled'
              ? 'text-xs text-red-400'
              : ev.status === 'on'
                ? 'text-xs text-emerald-400'
                : 'text-xs text-zinc-500'
          }
        >
          {statusLabel(ev.status)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Link
          href={`/console/${orgSlug}/events/${ev.id}`}
          className="text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          View roster →
        </Link>
        {!opts?.past && ev.status !== 'cancelled' ? (
          <form action={cancelEvent.bind(null, orgSlug, ev.id)}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-red-300">
              Cancel session
            </button>
          </form>
        ) : null}
        <DeleteEventButton
          orgSlug={orgSlug}
          eventId={ev.id}
          eventLabel={formatEventTime(ev)}
          recurring={!opts?.past && ev.schedule_id != null}
        />
      </div>
    </li>
  )

  const sessionsBlock = (
    <>
      <p className="text-xs text-zinc-500">
        Sessions are generated automatically from your recurring schedule for the next 30
        days — a new one rolls in each day, so you never have to add them by hand.
      </p>
      {upcomingEvents.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {upcomingEvents.map((ev) => renderEventItem(ev))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          No upcoming sessions — they&apos;ll appear here automatically once your schedule has
          upcoming dates. You can also add a one-off below.
        </p>
      )}

      <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-400 hover:text-zinc-200">
          + Add a one-off session
        </summary>
        <div className="px-4 pb-4">
          <OneOffEventForm
            locations={locations}
            createOneOff={createOneOffEvent.bind(null, orgSlug)}
          />
        </div>
      </details>

      {pastEvents.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-400 hover:text-zinc-200">
            Past sessions ({pastEvents.length})
          </summary>
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {pastEvents.map((ev) => renderEventItem(ev, { past: true }))}
            </ul>
          </div>
        </details>
      ) : null}
    </>
  )

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href="/console" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All groups
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          {org.activity ? <p className="mt-1 text-sm text-zinc-400">{org.activity}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/console/${orgSlug}/settings`}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Settings
          </Link>
          <a
            href={orgUrl}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
          >
            View public page →
          </a>
        </div>
      </div>

      {isSetup ? (
        <>
          {/* Sessions — the day-to-day view once setup is complete */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Sessions</h2>
            <div className="mt-3">{sessionsBlock}</div>
          </section>

          {/* Setup management, tucked away once it's done */}
          <details className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-200 hover:text-white">
              Locations &amp; schedule
            </summary>
            <div className="space-y-8 px-4 pb-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Locations
                </h3>
                <div className="mt-3 space-y-4">
                  {locationList}
                  {addLocationForm}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Recurring schedule
                </h3>
                <div className="mt-3 space-y-4">
                  {scheduleList}
                  {scheduleForm}
                </div>
              </div>
            </div>
          </details>
        </>
      ) : (
        <>
          {/* Guided setup — two ordered steps with the dependency made explicit */}
          <p className="mt-8 text-sm text-zinc-400">
            Two quick steps to go live. Once done, your sessions appear automatically.
          </p>

          {/* Step 1 — Location */}
          <section className="mt-8">
            <div className="flex items-center gap-3">
              <StepBadge n={1} done={hasLocation} />
              <h2 className="text-sm font-semibold">Add a location</h2>
            </div>
            <p className="mt-1 pl-9 text-xs text-zinc-500">
              Where do your sessions happen? You can add more later.
            </p>
            <div className="mt-3 space-y-4 pl-9">
              {locationList}
              {addLocationForm}
            </div>
          </section>

          {/* Step 2 — Recurring schedule */}
          <section className="mt-10">
            <div className="flex items-center gap-3">
              <StepBadge n={2} done={hasSchedule} locked={!hasLocation} />
              <h2 className={hasLocation ? 'text-sm font-semibold' : 'text-sm font-semibold text-zinc-600'}>
                Set your recurring schedule
              </h2>
            </div>
            {hasLocation ? (
              <>
                <p className="mt-1 pl-9 text-xs text-zinc-500">
                  Pick the days and time. We&apos;ll create the upcoming sessions for you.
                </p>
                <div className="mt-3 pl-9">{scheduleForm}</div>
              </>
            ) : (
              <p className="mt-1 pl-9 text-xs text-zinc-500">
                Add a location above first — a schedule needs somewhere to meet.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function StepBadge({ n, done, locked }: { n: number; done?: boolean; locked?: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
        ✓
      </span>
    )
  }
  return (
    <span
      className={
        locked
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-xs font-semibold text-zinc-600'
          : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500 text-xs font-semibold text-blue-400'
      }
    >
      {locked ? '🔒' : n}
    </span>
  )
}
