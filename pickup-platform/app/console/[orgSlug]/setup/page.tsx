import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg } from '@/lib/schedules'
import { createLocation, createSchedule } from '../../actions'
import { AddLocationButton } from '../add-location-button'
import { ScheduleForm } from '../schedule-form'
import { ConsolePage, ConsoleSection, ConsoleCard } from '../../_components/console-ui'

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

  const [locations, schedules] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
  ])

  const hasLocation = locations.length > 0
  const hasSchedule = schedules.length > 0
  const isComplete = hasLocation && hasSchedule
  const addLocation = createLocation.bind(null, orgSlug)

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
            : 'Two quick steps to go live — then sessions roll in on their own.'}
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
            title="Step 2 · Set your recurring schedule"
            description={
              hasLocation
                ? "Pick the days and time. We'll create the upcoming sessions for you."
                : 'Add a location above first — a schedule needs somewhere to meet.'
            }
            action={<StepBadge n={2} done={hasSchedule} locked={!hasLocation} />}
          >
            {hasLocation ? (
              <ScheduleForm orgSlug={orgSlug} locations={locations} createSchedule={createSchedule} />
            ) : (
              <p className="text-sm text-zinc-600">Locked until you add a location.</p>
            )}
          </ConsoleSection>
        </div>
      )}
    </ConsolePage>
  )
}
