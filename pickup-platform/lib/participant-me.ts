import type { OrgFeatures } from '@/lib/org-features'

export type MeStatKey =
  | 'caps'
  | 'sessions'
  | 'streak'
  | 'best_streak'
  | 'goals'
  | 'assists'
  | 'mvp_awards'

/** Which career chips to show on /me (feature-gated player stats / MVP). */
export function resolveMeStatKeys(args: {
  features: Pick<OrgFeatures, 'session_player_stats' | 'session_mvp_voting'>
  caps: number
  totalSessions: number
}): MeStatKey[] {
  const keys: MeStatKey[] = ['caps']

  if (args.totalSessions > 0 && args.totalSessions !== args.caps) {
    keys.push('sessions')
  }

  keys.push('streak', 'best_streak')

  if (args.features.session_player_stats) {
    keys.push('goals', 'assists')
  }

  if (args.features.session_mvp_voting) {
    keys.push('mvp_awards')
  }

  return keys
}

export function participantMeInitials(
  firstName: string,
  lastName: string,
  displayName: string,
): string {
  const first = firstName.trim().charAt(0)
  const last = lastName.trim().charAt(0)
  if (first || last) return `${first}${last}`.toUpperCase()
  return displayName.trim().charAt(0).toUpperCase() || '?'
}
