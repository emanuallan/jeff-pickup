import { getPublicRoster, rosterHeadcount } from '@/lib/signups'

type Props = {
  eventId: string
  capacity: number | null
  minPlayers: number | null
}

export async function EventHeadcount({ eventId, capacity, minPlayers }: Props) {
  const roster = await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)

  return (
    <>
      <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300">
        <span className="font-semibold text-zinc-100">{headcount}</span>
        {capacity != null ? ` / ${capacity}` : ''} coming
      </span>
      {minPlayers != null ? (
        <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-400">
          min {minPlayers} participants
        </span>
      ) : null}
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
