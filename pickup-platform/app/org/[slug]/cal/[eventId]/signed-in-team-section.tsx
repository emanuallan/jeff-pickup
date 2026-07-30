import dynamic from 'next/dynamic'
import type { SessionTeamOrUnassigned } from '@/lib/session-team'

const TeamPicker = dynamic(() => import('./team-picker').then((mod) => mod.TeamPicker))

type Props = {
  orgSlug: string
  eventId: string
  signupId: string
  teamCount: number
  team: SessionTeamOrUnassigned
  accent: string
  embedded?: boolean
}

export function SignedInTeamSection({
  orgSlug,
  eventId,
  signupId,
  teamCount,
  team,
  accent,
  embedded = false,
}: Props) {
  return (
    <div className={embedded ? 'space-y-4' : 'mt-5 space-y-5 border-t border-zinc-800 pt-5'}>
      <TeamPicker
        orgSlug={orgSlug}
        eventId={eventId}
        signupId={signupId}
        teamCount={teamCount}
        currentTeam={team}
        accent={accent}
      />
    </div>
  )
}
