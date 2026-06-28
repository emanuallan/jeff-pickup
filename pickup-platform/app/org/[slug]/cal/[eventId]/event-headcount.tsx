import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { LiveHeadcountPill } from './live-headcount-pill'

type Props = {
  orgSlug: string
  eventRef: string
  eventId: string
  capacity: number | null
  minPlayers: number | null
  accent: string
  pollActive: boolean
  ended?: boolean
}

export async function EventHeadcount({
  orgSlug,
  eventRef,
  eventId,
  capacity,
  minPlayers,
  accent,
  pollActive,
  ended = false,
}: Props) {
  const roster = await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)

  return (
    <>
      <LiveHeadcountPill
        orgSlug={orgSlug}
        eventRef={eventRef}
        initialHeadcount={headcount}
        capacity={capacity}
        accent={accent}
        active={pollActive}
        ended={ended}
      />
      {minPlayers != null ? (
        <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-400">
          min {minPlayers} participants
        </span>
      ) : null}
    </>
  )
}

export async function FeaturedEventHeadcount({
  eventId,
  capacity,
}: {
  eventId: string
  capacity: number | null
}) {
  const roster = await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)

  return (
    <>
      <span className="font-semibold text-zinc-100">{headcount}</span>
      {capacity != null ? ` / ${capacity}` : ''} coming
    </>
  )
}

export function FeaturedEventHeadcountFallback({ capacity }: { capacity: number | null }) {
  return (
    <>
      <span className="inline-block h-4 w-6 animate-pulse rounded bg-zinc-700/80" />
      {capacity != null ? ` / ${capacity}` : ''} coming
    </>
  )
}

export function EventHeadcountFallback({
  capacity,
  minPlayers,
  ended = false,
}: {
  capacity: number | null
  minPlayers: number | null
  ended?: boolean
}) {
  return (
    <>
      <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-500">
        <span className="inline-block h-4 w-8 animate-pulse rounded bg-zinc-700/80" />
        {capacity != null ? ` / ${capacity}` : ''} {ended ? 'came' : 'coming'}
      </span>
      {minPlayers != null ? (
        <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-500">
          min {minPlayers} participants
        </span>
      ) : null}
    </>
  )
}
