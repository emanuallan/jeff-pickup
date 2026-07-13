import { orgFeatures, type OrgSettings } from '@/lib/org-features'
import { MVP_VOTING_WINDOW_HOURS } from '@/lib/session-debrief'
import {
  getEventSessionMvpAwards,
  getEventSessionPlayerStats,
  isEventMvpFinalized,
} from '@/lib/session-debrief.server'
import { ConsoleSection, ConsoleCard } from '../../../_components/console-ui'

type Props = {
  orgId: string
  eventId: string
}

export async function EventDebriefSection({ orgId, eventId }: Props) {
  const [mvpAwards, playerStats, mvpFinalized] = await Promise.all([
    getEventSessionMvpAwards(orgId, eventId),
    getEventSessionPlayerStats(orgId, eventId),
    isEventMvpFinalized(eventId),
  ])

  if (!mvpFinalized && playerStats.length === 0) {
    return null
  }

  return (
    <ConsoleSection
      title="Debrief"
      description="MVP results and self-reported player stats from participants."
    >
      {mvpFinalized ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Session MVP</h3>
          {mvpAwards.length > 0 ? (
            <ul className="space-y-2">
              {mvpAwards.map((award) => (
                <li key={award.participant_id}>
                  <ConsoleCard className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-100">{award.participant_display_name}</span>
                    <span className="text-xs text-zinc-400">
                      {award.vote_count} vote{award.vote_count === 1 ? '' : 's'}
                    </span>
                  </ConsoleCard>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No MVP votes were cast for this session.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          MVP voting is still open or will finalize within {MVP_VOTING_WINDOW_HOURS} hours of
          session end.
        </p>
      )}

      {playerStats.length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Goals and assists
          </h3>
          <ul className="space-y-2">
            {playerStats.map((row) => (
              <li key={row.participant_id}>
                <ConsoleCard className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">{row.participant_display_name}</span>
                  <span className="text-xs text-zinc-400">
                    {row.goals}G · {row.assists}A
                  </span>
                </ConsoleCard>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ConsoleSection>
  )
}

export function shouldShowEventDebriefSection(
  org: { settings?: OrgSettings | null },
  eventEnded: boolean,
) {
  const features = orgFeatures(org)
  return (
    eventEnded &&
    features.session_feedback &&
    (features.session_mvp_voting || features.session_player_stats)
  )
}
