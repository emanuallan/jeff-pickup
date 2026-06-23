import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg } from '@/lib/schedules'
import { getUpcomingEventsForConsole } from '@/lib/events'
import { isOrgConsoleSetupComplete } from '@/lib/org-setup'
import { createLocation, createSchedule, createOneOffEvent } from '../../actions'
import { AddLocationButton } from '../add-location-button'
import { AddScheduleButton } from '../add-schedule-button'
import { AddOneOffButton } from '../add-one-off-button'
import { ConsolePage, ConsoleSection, ConsoleCard, btnSecondary } from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
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

export default async function SetupPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, schedules, upcomingEvents] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
    getUpcomingEventsForConsole(org.id),
  ])

  const hasLocation = locations.length > 0
  const upcomingSessionCount = upcomingEvents.filter((ev) => ev.status !== 'cancelled').length
  const hasSessions = schedules.length > 0 || upcomingSessionCount > 0
  const isComplete = isOrgConsoleSetupComplete({
    locationCount: locations.length,
    scheduleCount: schedules.length,
    upcomingSessionCount,
  })
  const addLocation = createLocation.bind(null, orgSlug)
  const createOneOff = createOneOffEvent.bind(null, orgSlug)

  const locationList =
    locations.length > 0 ? (
      <ul className="space-y-2">
        {locations.map((loc) => (
          <ConsoleCard key={loc.id} className="min-w-0 text-sm">
            <div className="font-medium text-zinc-100">{loc.label}</div>
            {loc.is_online ? (
              <div className="mt-0.5 text-xs text-zinc-500">
                Online{loc.meeting_url ? ' · meeting link set' : ''}
              </div>
            ) : loc.address ? (
              <div className="mt-0.5 text-xs text-zinc-500">{loc.address}</div>
            ) : null}
          </ConsoleCard>
        ))}
      </ul>
    ) : null

  return (
    <ConsolePage>
      <Link
        href={`/console/${orgSlug}`}
        className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <span aria-hidden>←</span> {org.name}
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Get started</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {isComplete
            ? 'Your group is set up. Sessions will appear automatically.'
            : 'Two quick steps to go live — recurring or one-off sessions both work.'}
        </p>
      </div>

      {isComplete ? (
        <div className="mt-8">
          <Link
            href={`/console/${orgSlug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Back to console
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <ConsoleSection
            title="Step 1 · Add a location"
            description="Where do your sessions happen? You can add more later."
            action={<StepBadge n={1} done={hasLocation} />}
          >
            <div className="space-y-4">
              {locationList}
              {!hasLocation ? <AddLocationButton addLocation={addLocation} /> : null}
            </div>
          </ConsoleSection>

          <ConsoleSection
            title="Step 2 · Add sessions"
            description={
              hasLocation
                ? 'Set a recurring schedule, or add a one-off session to publish your first event.'
                : 'Add a location above first — sessions need somewhere to meet.'
            }
            action={<StepBadge n={2} done={hasSessions} locked={!hasLocation} />}
          >
            {hasLocation && !hasSessions ? (
              <div className="flex flex-wrap gap-3">
                <AddScheduleButton
                  orgSlug={orgSlug}
                  locations={locations}
                  createSchedule={createSchedule}
                />
                <AddOneOffButton
                  locations={locations}
                  createOneOff={createOneOff}
                  className={btnSecondary}
                />
              </div>
            ) : !hasLocation ? (
              <p className="text-sm text-zinc-600">Locked until you add a location.</p>
            ) : null}
          </ConsoleSection>
        </div>
      )}
    </ConsolePage>
  )
}
