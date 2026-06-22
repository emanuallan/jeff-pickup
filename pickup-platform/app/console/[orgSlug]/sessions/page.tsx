import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getUpcomingEventsForConsole } from '@/lib/events'
import { createOneOffEvent } from '../../actions'
import { AddOneOffButton } from '../add-one-off-button'
import { SessionEventCard } from '../session-event-card'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function SessionsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, upcomingEvents] = await Promise.all([
    getLocationsForOrg(org.id),
    getUpcomingEventsForConsole(org.id),
  ])

  const hasLocation = locations.length > 0

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Sessions"
        description="Upcoming sessions from your recurring schedule — the next 5 per schedule roll in automatically."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          hasLocation ? (
            <AddOneOffButton
              locations={locations}
              createOneOff={createOneOffEvent.bind(null, orgSlug)}
            />
          ) : null
        }
      />

      <div className="mt-8">
        <ConsoleSection title={`Upcoming (${upcomingEvents.length})`}>
          {upcomingEvents.length > 0 ? (
            <ul className="space-y-2">
              {upcomingEvents.map((ev) => (
                <li key={ev.id}>
                  <SessionEventCard orgSlug={orgSlug} event={ev} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              No upcoming sessions yet. Add a recurring schedule or a one-off session to get started.
            </p>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
