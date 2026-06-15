import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventById, formatEventTime, statusLabel } from '@/lib/events'
import { getRosterWithContact, rosterHeadcount } from '@/lib/signups'
import { arrivalStatusEmoji } from '@/lib/arrival-status'

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
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href={`/console/${orgSlug}`} className="text-sm text-zinc-400 hover:text-zinc-200">
        ← {org.name}
      </Link>

      <h1 className="mt-6 text-xl font-semibold">{formatEventTime(event)}</h1>
      <p className="mt-1 text-sm text-zinc-400">{event.location_label}</p>
      <p className="mt-2 text-xs text-zinc-500">
        {statusLabel(event.status)} · {headcount}
        {event.capacity != null ? ` / ${event.capacity}` : ''} coming · min {event.min_players}
      </p>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Roster ({roster.length})
          </h2>
          {roster.length > 0 ? (
            <a
              href={`/api/console/${orgSlug}/events/${eventId}/roster`}
              className="text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Export CSV
            </a>
          ) : null}
        </div>

        {roster.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No sign-ups yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {roster.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {arrivalStatusEmoji(e.arrival_status, event.location_is_online)} {e.display_name}
                      {e.guest_count > 0 ? ` +${e.guest_count}` : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {e.first_name} {e.last_name} · {e.phone}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
