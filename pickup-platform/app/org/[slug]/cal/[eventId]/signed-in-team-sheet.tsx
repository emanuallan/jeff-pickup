import { BottomSheet } from '@/app/_components/bottom-sheet'
import { hexToRgba } from '@/lib/colors'
import type { SessionTeamOrUnassigned } from '@/lib/session-team'
import { TeamPicker } from './team-picker'

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  eventId: string
  signupId: string
  teamCount: number
  team: SessionTeamOrUnassigned
  accent: string
}

export function SignedInTeamSheet({
  open,
  onClose,
  orgSlug,
  eventId,
  signupId,
  teamCount,
  team,
  accent,
}: Props) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      ariaLabelledby="signed-in-team-title"
      panelStyle={{
        boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
      }}
    >
      <h2 id="signed-in-team-title" className="text-lg font-semibold tracking-tight text-zinc-50">
        Pick your team
      </h2>

      <div className="mt-5">
        <TeamPicker
          orgSlug={orgSlug}
          eventId={eventId}
          signupId={signupId}
          teamCount={teamCount}
          currentTeam={team}
          accent={accent}
          hideHeading
          onSuccess={onClose}
        />
      </div>
    </BottomSheet>
  )
}
