import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg, formatWeekdays, formatTime, formatIntervalWeeks } from '@/lib/schedules'
import {
  getUpcomingEventsForConsole,
  getPastEventsForConsole,
  formatEventTime,
  eventDisplayName,
  type EventWithLocation,
} from '@/lib/events'
import { orgBaseUrl } from '@/lib/og-metadata'
import { createLocation, createOneOffEvent, createSchedule } from '../actions'
import { ScheduleForm } from './schedule-form'
import { AddLocationForm } from './add-location-form'
import { DeleteLocationButton } from './delete-location-button'
import { DeleteScheduleButton } from './delete-schedule-button'
import { EditScheduleButton } from './edit-schedule-button'
import { DeleteEventButton } from './delete-event-button'
import { EventStatusSelect } from './event-status-select'
import { EventAnnouncementEditor } from './event-announcement-editor'
import { OrgConsoleHeader } from './org-console-header'
import { arrowRight } from '@/lib/text-arrows'
import {
  ConsolePage,
  ConsoleSection,
  ConsoleCard,
  Disclosure,
  chipAction,
} from '../_components/console-ui'

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

  const orgUrl = orgBaseUrl(org.slug)
  const addLocation = createLocation.bind(null, orgSlug)

  const hasLocation = locations.length > 0
  const hasSchedule = schedules.length > 0
  const isSetup = hasLocation && hasSchedule

  const locationList =
    locations.length > 0 ? (
      <ul className="space-y-2">
        {locations.map((loc) => (
          <ConsoleCard key={loc.id} className="min-w-0 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <div className="font-medium text-zinc-100">{loc.label}</div>
                {loc.is_online ? (
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Online{loc.meeting_url ? ' · meeting link set' : ''}
                  </div>
                ) : loc.address ? (
                  <div className="mt-0.5 text-xs text-zinc-500">{loc.address}</div>
                ) : null}
              </div>
              <DeleteLocationButton
                orgSlug={orgSlug}
                locationId={loc.id}
                locationLabel={loc.label}
              />
            </div>
          </ConsoleCard>
        ))}
      </ul>
    ) : null

  const addLocationForm = <AddLocationForm addLocation={addLocation} />

  const scheduleList =
    schedules.length > 0 ? (
      <ul className="space-y-2">
        {schedules.map((s) => (
          <ConsoleCard key={s.id} className="min-w-0 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <div className="font-medium text-zinc-100">{s.title}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {formatIntervalWeeks(s.interval_weeks)} · {formatWeekdays(s.byweekday)} ·{' '}
                  {formatTime(s.start_time)} · {s.timezone}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {s.capacity ? `Capacity ${s.capacity}` : 'No capacity limit'}
                  {s.min_players != null ? ` · min ${s.min_players} participants` : ''}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1 sm:justify-end">
                <EditScheduleButton orgSlug={orgSlug} schedule={s} locations={locations} />
                <DeleteScheduleButton
                  orgSlug={orgSlug}
                  scheduleId={s.id}
                  scheduleTitle={s.title}
                />
              </div>
            </div>
          </ConsoleCard>
        ))}
      </ul>
    ) : null

  const scheduleForm = (
    <ScheduleForm orgSlug={orgSlug} locations={locations} createSchedule={createSchedule} />
  )

  const sessionFallback = 'Session'

  const renderEventItem = (ev: EventWithLocation, opts?: { past?: boolean }) => (
    <ConsoleCard key={ev.id} className="min-w-0 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-100">{formatEventTime(ev)}</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {eventDisplayName(ev.title, sessionFallback)} · {ev.location_label}
          </div>
        </div>
        <EventStatusSelect orgSlug={orgSlug} eventId={ev.short_id} status={ev.status} />
      </div>
      <EventAnnouncementEditor
        orgSlug={orgSlug}
        eventId={ev.short_id}
        announcement={ev.announcement}
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-white/5 pt-2">
        <Link
          href={`/console/${orgSlug}/events/${ev.short_id}`}
          className={`${chipAction} text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200`}
        >
          View analytics {arrowRight}
        </Link>
        <DeleteEventButton
          orgSlug={orgSlug}
          eventId={ev.short_id}
          eventLabel={formatEventTime(ev)}
          recurring={!opts?.past && ev.schedule_id != null}
        />
      </div>
    </ConsoleCard>
  )

  return (
    <ConsolePage>
      <Link href="/console" className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200">
        <span aria-hidden>←</span> All groups
      </Link>

      <OrgConsoleHeader
        orgSlug={orgSlug}
        orgName={org.name}
        orgActivity={org.activity || null}
        logoUrl={org.branding.logo_url}
        publicUrl={orgUrl}
        locations={locations}
        canAddOneOff={hasLocation}
        createOneOff={createOneOffEvent.bind(null, orgSlug)}
      />

      {isSetup ? (
        <div className="mt-8 space-y-6">
          {/* Sessions — collapsed by default; they roll in automatically so this stays tidy. */}
          <ConsoleSection
            title={`Sessions${upcomingEvents.length > 0 ? ` (${upcomingEvents.length})` : ''}`}
            description="Auto-generated from your recurring schedule — the next 5 upcoming sessions per schedule roll in automatically."
            collapsible
            defaultOpen={false}
          >
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-2">{upcomingEvents.map((ev) => renderEventItem(ev))}</ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No upcoming sessions — they&apos;ll appear here automatically once your schedule has
                upcoming dates. Use Actions to add a one-off.
              </p>
            )}

            {pastEvents.length > 0 ? (
              <div className="mt-4">
                <Disclosure summary={`Past sessions (${pastEvents.length})`}>
                  <ul className="space-y-2">
                    {pastEvents.map((ev) => renderEventItem(ev, { past: true }))}
                  </ul>
                </Disclosure>
              </div>
            ) : null}
          </ConsoleSection>

          {/* Locations */}
          <ConsoleSection title="Locations" description="Where your sessions happen.">
            <div className="space-y-4">
              {locationList}
              <Disclosure summary="+ Add location">{addLocationForm}</Disclosure>
            </div>
          </ConsoleSection>

          {/* Recurring schedule */}
          <ConsoleSection title="Recurring schedule" description="When sessions repeat.">
            <div className="space-y-4">
              {scheduleList}
              <Disclosure summary="+ Add schedule">{scheduleForm}</Disclosure>
            </div>
          </ConsoleSection>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-zinc-400">
            Two quick steps to go live. Once done, your sessions appear automatically.
          </p>

          {/* Step 1 — Location */}
          <ConsoleSection
            title="Step 1 · Add a location"
            description="Where do your sessions happen? You can add more later."
            action={<StepBadge n={1} done={hasLocation} />}
          >
            <div className="space-y-4">
              {locationList}
              {!hasLocation ? addLocationForm : null}
            </div>
          </ConsoleSection>

          {/* Step 2 — Recurring schedule */}
          <ConsoleSection
            title="Step 2 · Set your recurring schedule"
            description={
              hasLocation
                ? "Pick the days and time. We'll create the upcoming sessions for you."
                : 'Add a location above first — a schedule needs somewhere to meet.'
            }
            action={<StepBadge n={2} done={hasSchedule} locked={!hasLocation} />}
          >
            {hasLocation ? (
              scheduleForm
            ) : (
              <p className="text-sm text-zinc-600">Locked until you add a location.</p>
            )}
          </ConsoleSection>
        </div>
      )}
    </ConsolePage>
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
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-zinc-600'
          : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-500 text-xs font-semibold text-indigo-300'
      }
    >
      {locked ? '🔒' : n}
    </span>
  )
}
