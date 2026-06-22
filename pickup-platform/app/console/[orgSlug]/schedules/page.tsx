import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getSchedulesForOrg, formatWeekdays, formatTime, formatIntervalWeeks } from '@/lib/schedules'
import { createSchedule } from '../../actions'
import { ScheduleForm } from '../schedule-form'
import { EditScheduleButton } from '../edit-schedule-button'
import { DeleteScheduleButton } from '../delete-schedule-button'
import { ConsolePage, ConsoleHeader, ConsoleSection, ConsoleCard, Disclosure } from '../../_components/console-ui'

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

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Recurring schedules"
        description="When sessions repeat — upcoming sessions are created automatically."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8">
        <ConsoleSection title={`Schedules (${schedules.length})`}>
          <div className="space-y-4">
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
                          />
                        </div>
                      </div>
                    </ConsoleCard>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No schedules yet. Add one below — you&apos;ll need at least one location first.
              </p>
            )}
            {locations.length > 0 ? (
              <Disclosure summary="+ Add schedule">
                <ScheduleForm orgSlug={orgSlug} locations={locations} createSchedule={createSchedule} />
              </Disclosure>
            ) : (
              <p className="text-sm text-zinc-600">
                Add a location before creating a schedule.
              </p>
            )}
          </div>
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
