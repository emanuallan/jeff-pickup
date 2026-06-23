import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg, formatWeekdays, formatTime, formatIntervalWeeks, getScheduleDeleteImpact } from '@/lib/schedules'
import { createSchedule } from '../../actions'
import { AddScheduleButton } from '../add-schedule-button'
import { EditScheduleButton } from '../edit-schedule-button'
import { DeleteScheduleButton } from '../delete-schedule-button'
import { ConsolePage, ConsoleHeader, ConsoleSection, ConsoleCard } from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function SchedulesPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, schedules] = await Promise.all([
    getLocationsForOrg(org.id),
    getSchedulesForOrg(org.id),
  ])

  const deleteImpacts = await Promise.all(
    schedules.map(async (s) => ({
      scheduleId: s.id,
      impact: await getScheduleDeleteImpact(org.id, s.id),
    })),
  )
  const impactByScheduleId = Object.fromEntries(
    deleteImpacts.map(({ scheduleId, impact }) => [scheduleId, impact]),
  )

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Recurring schedules"
        description="When sessions repeat — upcoming sessions are created automatically."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          locations.length > 0 ? (
            <AddScheduleButton
              orgSlug={orgSlug}
              locations={locations}
              createSchedule={createSchedule}
            />
          ) : null
        }
      />

      <div className="mt-8">
        <ConsoleSection title={`Schedules (${schedules.length})`}>
          {schedules.length > 0 ? (
            <ul className="space-y-2">
              {schedules.map((s) => (
                <li key={s.id}>
                  <ConsoleCard className="min-w-0 text-sm">
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
                          impact={impactByScheduleId[s.id]}
                        />
                      </div>
                    </div>
                  </ConsoleCard>
                </li>
              ))}
            </ul>
          ) : locations.length > 0 ? (
            <p className="text-sm text-zinc-500">No schedules yet. Tap Add schedule above.</p>
          ) : (
            <p className="text-sm text-zinc-500">
              Add a location first — a schedule needs somewhere to meet.
            </p>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
