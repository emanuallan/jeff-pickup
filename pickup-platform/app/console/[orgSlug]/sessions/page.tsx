import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { getUpcomingEventsForConsole } from '@/lib/events'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { orgFeatures } from '@/lib/org-features'
import { createOneOffEvent } from '../../actions'
import { AddOneOffButton } from '../add-one-off-button'
import { SessionEventCard } from '../session-event-card'
import {
  ConsolePage,
  ConsoleHeader,
  ConsoleSection,
  EmptyState,
  btnOutline,
  btnPrimary,
} from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function SessionsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const [locations, upcomingEvents, stripeAccount] = await Promise.all([
    getLocationsForOrg(org.id),
    getUpcomingEventsForConsole(org.id),
    getOrgStripeAccount(org.id),
  ])

  const hasLocation = locations.length > 0
  const sessionFeesEnabled = Boolean(stripeAccount?.charges_enabled)
  const teamSelectionEnabled = orgFeatures(org).team_selection
  const createOneOff = createOneOffEvent.bind(null, orgSlug)

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Sessions"
        description="Upcoming sessions from your schedules and one-offs — the next ones roll in automatically."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          hasLocation ? (
            <AddOneOffButton
              locations={locations}
              createOneOff={createOneOff}
              sessionFeesEnabled={sessionFeesEnabled}
              teamSelectionEnabled={teamSelectionEnabled}
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
                  <SessionEventCard
                    orgSlug={orgSlug}
                    event={ev}
                    locations={locations}
                    sessionFeesEnabled={sessionFeesEnabled}
                    teamSelectionEnabled={teamSelectionEnabled}
                  />
                </li>
              ))}
            </ul>
          ) : !hasLocation ? (
            <EmptyState
              title="Add a location first"
              description="Sessions need somewhere to meet — a field, gym, park, etc."
            >
              <Link href={`/console/${orgSlug}/locations`} className={btnPrimary}>
                Go to locations
              </Link>
            </EmptyState>
          ) : (
            <EmptyState
              title="No upcoming sessions yet"
              description="Add a recurring schedule so sessions appear automatically, or create a one-off."
            >
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={`/console/${orgSlug}/schedules`} className={btnPrimary}>
                  Add a schedule
                </Link>
                <AddOneOffButton
                  locations={locations}
                  createOneOff={createOneOff}
                  sessionFeesEnabled={sessionFeesEnabled}
                  teamSelectionEnabled={teamSelectionEnabled}
                  className={btnOutline}
                />
              </div>
            </EmptyState>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
