import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getPastEventsForConsole } from '@/lib/events'
import { SessionEventCard } from '../../session-event-card'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function PastSessionsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const pastEvents = await getPastEventsForConsole(org.id)

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Past sessions"
        description="Sessions that have already happened."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8">
        <ConsoleSection title={`Past (${pastEvents.length})`}>
          {pastEvents.length > 0 ? (
            <ul className="space-y-2">
              {pastEvents.map((ev) => (
                <li key={ev.id}>
                  <SessionEventCard orgSlug={orgSlug} event={ev} past />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No past sessions yet.</p>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
