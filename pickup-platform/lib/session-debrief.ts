export type SessionDebriefStep = 'mvp' | 'stats' | 'feedback'

export type SessionDebriefBallotEntry = {
  participant_id: string
  display_name: string
}

export type SessionDebriefState = {
  mvp_voting_enabled: boolean
  player_stats_enabled: boolean
  feedback_enabled: boolean
  mvp_voting_open: boolean
  mvp_vote_cast: boolean
  mvp_nominee_participant_id: string | null
  mvp_skipped: boolean
  mvp_step_complete: boolean
  stats_submitted: boolean
  stats_skipped: boolean
  stats_step_complete: boolean
  feedback_submitted: boolean
  feedback_skipped: boolean
  feedback_step_complete: boolean
  debrief_complete: boolean
  initial_step: SessionDebriefStep
  steps: SessionDebriefStep[]
  ballot: SessionDebriefBallotEntry[]
}

export type SessionMvpBadgeInfo = {
  event_label: string
  event_id: string
}

export type SessionMvpAwardRow = {
  participant_id: string
  participant_display_name: string
  vote_count: number
}

export type SessionPlayerStatsRow = {
  participant_id: string
  participant_display_name: string
  goals: number
  assists: number
}

export const MVP_VOTING_WINDOW_HOURS = 6

export function parseSessionDebriefState(raw: unknown): SessionDebriefState | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const steps = Array.isArray(value.steps)
    ? value.steps.filter(
        (step): step is SessionDebriefStep =>
          step === 'mvp' || step === 'stats' || step === 'feedback',
      )
    : []

  const initialStep = value.initial_step
  const initial_step: SessionDebriefStep =
    initialStep === 'mvp' || initialStep === 'stats' || initialStep === 'feedback'
      ? initialStep
      : (steps[0] ?? 'feedback')

  const ballot = Array.isArray(value.ballot)
    ? value.ballot
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null
          const row = entry as Record<string, unknown>
          if (typeof row.participant_id !== 'string') return null
          return {
            participant_id: row.participant_id,
            display_name:
              typeof row.display_name === 'string' ? row.display_name : 'Player',
          }
        })
        .filter((entry): entry is SessionDebriefBallotEntry => entry != null)
    : []

  return {
    mvp_voting_enabled: value.mvp_voting_enabled === true,
    player_stats_enabled: value.player_stats_enabled === true,
    feedback_enabled: value.feedback_enabled === true,
    mvp_voting_open: value.mvp_voting_open === true,
    mvp_vote_cast: value.mvp_vote_cast === true,
    mvp_nominee_participant_id:
      typeof value.mvp_nominee_participant_id === 'string'
        ? value.mvp_nominee_participant_id
        : null,
    mvp_skipped: value.mvp_skipped === true,
    mvp_step_complete: value.mvp_step_complete === true,
    stats_submitted: value.stats_submitted === true,
    stats_skipped: value.stats_skipped === true,
    stats_step_complete: value.stats_step_complete === true,
    feedback_submitted: value.feedback_submitted === true,
    feedback_skipped: value.feedback_skipped === true,
    feedback_step_complete: value.feedback_step_complete === true,
    debrief_complete: value.debrief_complete === true,
    initial_step,
    steps,
    ballot,
  }
}

export function debriefStepIndex(
  steps: readonly SessionDebriefStep[],
  step: SessionDebriefStep,
): number {
  const index = steps.indexOf(step)
  return index >= 0 ? index + 1 : 1
}

export function debriefStepCount(steps: readonly SessionDebriefStep[]): number {
  return Math.max(steps.length, 1)
}

export function nextDebriefStep(
  steps: readonly SessionDebriefStep[],
  current: SessionDebriefStep,
): SessionDebriefStep | null {
  const index = steps.indexOf(current)
  if (index < 0 || index >= steps.length - 1) return null
  return steps[index + 1] ?? null
}

export function previousDebriefStep(
  steps: readonly SessionDebriefStep[],
  current: SessionDebriefStep,
): SessionDebriefStep | null {
  const index = steps.indexOf(current)
  if (index <= 0) return null
  return steps[index - 1] ?? null
}

export function isMvpWizardStepPending(state: SessionDebriefState): boolean {
  return state.mvp_voting_enabled && !state.mvp_vote_cast && !state.mvp_skipped
}

export function resolveInitialDebriefStep(state: SessionDebriefState): SessionDebriefStep {
  if (state.steps.length === 0) return 'feedback'

  for (const step of state.steps) {
    if (step === 'mvp' && isMvpWizardStepPending(state)) return 'mvp'
    if (step === 'stats' && !state.stats_step_complete) return 'stats'
    if (step === 'feedback' && !state.feedback_step_complete) return 'feedback'
  }

  return state.initial_step
}

export function validateSessionPlayerStatsInput(
  goals: number,
  assists: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(goals) || goals < 0 || goals > 99) {
    return { ok: false, error: 'Goals must be a whole number from 0 to 99.' }
  }

  if (!Number.isInteger(assists) || assists < 0 || assists > 99) {
    return { ok: false, error: 'Assists must be a whole number from 0 to 99.' }
  }

  return { ok: true }
}

export function debriefStepTitle(
  step: SessionDebriefStep,
  options?: { mvpVotingOpen?: boolean },
): string {
  switch (step) {
    case 'mvp':
      return options?.mvpVotingOpen === false ? 'Session MVP' : 'Vote for session MVP'
    case 'stats':
      return 'Your goals and assists'
    case 'feedback':
      return 'Rate this session'
  }
}
