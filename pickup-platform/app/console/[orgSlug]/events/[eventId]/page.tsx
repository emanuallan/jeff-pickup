import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventById, formatEventTime, statusLabel } from '@/lib/events'
import { getRosterWithContact, rosterHeadcount } from '@/lib/signups'
import { arrivalStatusEmoji } from '@/lib/arrival-status'
import { ConsolePage, ConsoleHeader, ConsoleSection, ConsoleCard } from '../../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

export default async function ConsoleEventRosterPage({ params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const event = await getEventById(eventId, org.id)
  if (!event) {
    notFound()
  }

  const roster = await getRosterWithContact(eventId)
  const headcount = rosterHeadcount(roster)

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title={formatEventTime(event)}
        description={event.location_label}
        backHref={`/console/${orgSlug}`}
        backLabel={org.name}
      />
      <p className="mt-2 text-xs text-zinc-500">
        {statusLabel(event.status)} · {headcount}
        {event.capacity != null ? ` / ${event.capacity}` : ''} coming · min {event.min_players}
      </p>

      <div className="mt-8">
        <ConsoleSection
          title={`Roster (${roster.length})`}
          action={
            roster.length > 0 ? (
              <a
                href={`/api/console/${orgSlug}/events/${eventId}/roster`}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Export CSV
              </a>
            ) : undefined
          }
        >
          {roster.length === 0 ? (
            <p className="text-sm text-zinc-500">No sign-ups yet.</p>
          ) : (
            <ul className="space-y-2">
              {roster.map((e) => (
                <ConsoleCard key={e.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-zinc-100">
                        {arrivalStatusEmoji(e.arrival_status, event.location_is_online)}{' '}
                        {e.display_name}
                        {e.guest_count > 0 ? ` +${e.guest_count}` : ''}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {e.first_name} {e.last_name} · {e.phone}
                      </div>
                    </div>
                  </div>
                </ConsoleCard>
              ))}
            </ul>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
