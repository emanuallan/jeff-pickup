import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { HeadcountInteractive } from './headcount-interactive'

type Props = {
  orgSlug: string
  eventRef: string
  scheduleId: string | null
  eventId: string
  capacity: number | null
  minPlayers: number | null
  accent: string
}

export async function EventHeadcount({
  orgSlug,
  eventRef,
  scheduleId,
  eventId,
  capacity,
  minPlayers,
  accent,
}: Props) {
  const roster = await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)

  return (
    <HeadcountInteractive
      orgSlug={orgSlug}
      eventRef={eventRef}
      headcount={headcount}
      capacity={capacity}
      minPlayers={minPlayers}
      accent={accent}
    />
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
}: {
  capacity: number | null
  minPlayers: number | null
}) {
  return (
    <>
      <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-500">
        <span className="inline-block h-4 w-8 animate-pulse rounded bg-zinc-700/80" />
        {capacity != null ? ` / ${capacity}` : ''} coming
      </span>
      {minPlayers != null ? (
        <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-500">
          min {minPlayers} participants
        </span>
      ) : null}
    </>
  )
}
