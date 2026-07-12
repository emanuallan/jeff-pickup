import type { OrgGroupRules } from './group-rules'
import { parseOrgGroupRules } from './group-rules'
import type { OrgSponsorshipSettings } from './sponsorship'
import { parseOrgSponsorshipSettings } from './sponsorship'

export type OrgFeatures = {
  user_badges: boolean
  leaderboard: boolean
  returning_signup_modal: boolean
  /** When false, public pages hide the roster and show signup confirmation only. */
  public_roster: boolean
  /** When false, participants cannot add guests to their sign-up. */
  guest_signups: boolean
  /** When false, post-session feedback prompts and console feedback views are hidden. */
  session_feedback: boolean
  /** When true, participants can vote for session MVP in the post-session debrief wizard. */
  session_mvp_voting: boolean
  /** When true, participants can self-report goals and assists after a session. */
  session_player_stats: boolean
  /** When true, participants must accept group rules before signing up. */
  group_rules: boolean
  /** When true, public sponsorship page and sponsor footer are available. */
  group_sponsorships: boolean
}

export type WaitlistPromotionMode = 'strict_fifo' | 'skip_ahead'

export type OrgWaitlistSettings = {
  promotion_mode: WaitlistPromotionMode
}

export type OrgSettings = {
  features: OrgFeatures
  waitlist?: OrgWaitlistSettings
  group_rules?: OrgGroupRules | null
  sponsorships?: OrgSponsorshipSettings | null
}

export const DEFAULT_ORG_FEATURES: OrgFeatures = {
  user_badges: true,
  leaderboard: true,
  returning_signup_modal: true,
  public_roster: true,
  guest_signups: true,
  session_feedback: true,
  session_mvp_voting: false,
  session_player_stats: false,
  group_rules: false,
  group_sponsorships: false,
}

export const DEFAULT_ORG_WAITLIST_SETTINGS: OrgWaitlistSettings = {
  promotion_mode: 'strict_fifo',
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  features: DEFAULT_ORG_FEATURES,
  waitlist: DEFAULT_ORG_WAITLIST_SETTINGS,
}

export function parseWaitlistSettings(raw: unknown): OrgWaitlistSettings {
  const waitlist = raw as Partial<OrgWaitlistSettings> | null | undefined
  const mode = waitlist?.promotion_mode

  return {
    promotion_mode: mode === 'skip_ahead' ? 'skip_ahead' : 'strict_fifo',
  }
}

export function parseOrgSettings(raw: unknown): OrgSettings {
  const settings = raw as Partial<OrgSettings> | null
  const features = settings?.features as Partial<OrgFeatures> | null | undefined

  return {
    features: {
      user_badges: features?.user_badges !== false,
      leaderboard: features?.leaderboard !== false,
      returning_signup_modal: features?.returning_signup_modal !== false,
      public_roster: features?.public_roster !== false,
      guest_signups: features?.guest_signups !== false,
      session_feedback: features?.session_feedback !== false,
      session_mvp_voting: features?.session_mvp_voting === true,
      session_player_stats: features?.session_player_stats === true,
      // Opt-in: missing key = false. Others use opt-out (!== false).
      group_rules: features?.group_rules === true,
      group_sponsorships: features?.group_sponsorships === true,
    },
    waitlist: parseWaitlistSettings(settings?.waitlist),
    group_rules: parseOrgGroupRules(settings?.group_rules),
    sponsorships: parseOrgSponsorshipSettings(settings?.sponsorships),
  }
}

/** Safe accessor — handles stale cached org rows missing settings. */
export function orgSettings(org: { settings?: OrgSettings | null }): OrgSettings {
  return parseOrgSettings(org.settings)
}

export function orgFeatures(org: { settings?: OrgSettings | null }): OrgFeatures {
  return orgSettings(org).features
}

export function orgSponsorshipSettings(org: { settings?: OrgSettings | null }) {
  return orgSettings(org).sponsorships
}

export function orgWaitlistSettings(org: { settings?: OrgSettings | null }): OrgWaitlistSettings {
  return orgSettings(org).waitlist ?? DEFAULT_ORG_WAITLIST_SETTINGS
}

export type OrgFeatureDefinition = {
  key: keyof OrgFeatures
  label: string
  description: string
}

export const ORG_FEATURE_DEFINITIONS: OrgFeatureDefinition[] = [
  {
    key: 'user_badges',
    label: 'User badges',
    description: 'Show milestone, streak, and caps badges on the event roster.',
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    description:
      'Show the caps and streak leaderboard on public pages. The leaderboard only becomes visible after 3 completed sessions.',
  },
  {
    key: 'returning_signup_modal',
    label: 'Quick signup prompt',
    description:
      'Show returning participants a simplified one-tap signup modal before the full join form.',
  },
  {
    key: 'public_roster',
    label: 'Public roster',
    description:
      "Show who's coming on public session pages. When off, sign-ups still work and participants see a confirmation message.",
  },
  {
    key: 'guest_signups',
    label: 'Guest sign-ups',
    description: 'Let participants bring guests when they join or update their sign-up.',
  },
  {
    key: 'session_feedback',
    label: 'Session feedback',
    description:
      'Ask participants to rate sessions after they end and show responses in the console.',
  },
  {
    key: 'session_mvp_voting',
    label: 'Session MVP voting',
    description:
      'Let participants vote for a session MVP in the post-session debrief. Voting closes 6 hours after the session ends.',
  },
  {
    key: 'session_player_stats',
    label: 'Goals and assists',
    description:
      'Let participants self-report goals and assists in the post-session debrief. Best for soccer and similar sports.',
  },
  {
    key: 'group_rules',
    label: 'Group rules',
    description:
      'Require participants to accept your group rules before they can sign up for sessions.',
  },
  {
    key: 'group_sponsorships',
    label: 'Group sponsorships',
    description:
      'Let visitors sponsor your group with monthly contributions. Sponsors appear as logos on your public pages after you approve them.',
  },
]
