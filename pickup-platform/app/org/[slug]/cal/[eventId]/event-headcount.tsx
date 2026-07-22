import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { showHeadcountChipOnCard, showMinPlayersChip } from '@/lib/headcount-display'
import { LiveHeadcountPill } from './live-headcount-pill'

type Props = {
  orgSlug: string
  eventRef: string
  eventId: string
  capacity: number | null
  minPlayers: number | null
  status: string
  accent: string
  pollActive: boolean
  ended?: boolean
  cancelled?: boolean
}

export async function EventHeadcount({
  orgSlug,
  eventRef,
  eventId,
  capacity,
  minPlayers,
  status,
  accent,
  pollActive,
  ended = false,
  cancelled = false,
}: Props) {
  const roster = cancelled ? [] : await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)
  const showMin = showMinPlayersChip(minPlayers, status)

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
        cancelled={cancelled}
      />
      {showMin ? (
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

  if (!showHeadcountChipOnCard(headcount)) {
    return null
  }

  return (
    <>
      <span className="font-semibold text-zinc-100">{headcount}</span>
      {capacity != null ? ` / ${capacity}` : ''} coming
    </>
  )
}

export function FeaturedEventHeadcountFallback(_props: { capacity: number | null }) {
  return null
}

export function EventHeadcountFallback({
  minPlayers,
  status,
}: {
  capacity: number | null
  minPlayers: number | null
  status: string
  ended?: boolean
}) {
  if (!showMinPlayersChip(minPlayers, status)) {
    return null
  }

  return (
    <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-500">
      min {minPlayers} participants
    </span>
  )
}
