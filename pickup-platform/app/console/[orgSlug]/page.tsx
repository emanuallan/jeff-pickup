import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg, formatWeekdays, formatTime } from '@/lib/schedules'
import { getEventsForOrgConsole, formatEventDateTime, statusLabel } from '@/lib/events'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  cancelEvent,
  createLocation,
  createOneOffEvent,
  createSchedule,
} from '../actions'
import { MaterializeButton } from './materialize-button'
import { ScheduleForm } from './schedule-form'
import { BrandingForm } from './branding-form'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, schedules, events] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
    getEventsForOrgConsole(org.id),
  ])

  const rootDomain = getRootDomain()
  const orgUrl =
    process.env.NODE_ENV === 'development'
      ? `http://${org.slug}.localhost:3000`
      : `https://${org.slug}.${rootDomain}`

  const addLocation = createLocation.bind(null, orgSlug)
  const addOneOff = createOneOffEvent.bind(null, orgSlug)

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href="/console" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All groups
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          {org.activity ? (
            <p className="mt-1 text-sm text-zinc-400">{org.activity}</p>
          ) : null}
        </div>
        <a
          href={orgUrl}
          className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
        >
          View public page →
        </a>
      </div>

      {/* Branding */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Branding</h2>
        <BrandingForm
          orgSlug={orgSlug}
          logoUrl={org.branding.logo_url}
          accentColor={org.branding.accent_color}
        />
      </section>

      {/* Locations */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Locations</h2>

        {locations.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {locations.map((loc) => (
              <li
                key={loc.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
              >
                <div className="font-medium">{loc.label}</div>
                {loc.address ? (
                  <div className="mt-0.5 text-xs text-zinc-500">{loc.address}</div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">Add a location before creating a schedule.</p>
        )}

        <form action={addLocation} className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
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
      </section>

      {/* Schedules */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Recurring schedule
        </h2>

        {schedules.length > 0 ? (
          <ul className="mt-3 space-y-2">
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
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No recurring schedule yet.</p>
        )}

        {locations.length > 0 ? (
          <div className="mt-4">
            <ScheduleForm orgSlug={orgSlug} locations={locations} createSchedule={createSchedule} />
          </div>
        ) : null}

        <MaterializeButton orgSlug={orgSlug} />
      </section>

      {/* Events */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Sessions</h2>

        {events.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{formatEventDateTime(ev.starts_at)}</div>
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
                  {ev.status !== 'cancelled' ? (
                    <form action={cancelEvent.bind(null, orgSlug, ev.id)}>
                      <button
                        type="submit"
                        className="text-xs text-zinc-500 hover:text-red-300"
                      >
                        Cancel session
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No sessions yet. Add a schedule and click Generate, or add a one-off below.
          </p>
        )}

        {locations.length > 0 ? (
          <form action={addOneOff} className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="text-xs font-medium text-zinc-400">Add one-off session</p>
            <select
              name="location_id"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={locations[0]?.id}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
            <input
              name="starts_at"
              type="datetime-local"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-zinc-500">Capacity (optional)</span>
                <input
                  name="capacity"
                  type="number"
                  min={2}
                  max={999}
                  placeholder="No limit"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Min players</span>
                <input
                  name="min_players"
                  type="number"
                  min={2}
                  max={999}
                  defaultValue={10}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Add session
            </button>
          </form>
        ) : null}
      </section>
    </main>
  )
}
