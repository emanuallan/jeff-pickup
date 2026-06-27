export type OrgFeatures = {
  user_badges: boolean
  leaderboard: boolean
  returning_signup_modal: boolean
}

export type OrgSettings = {
  features: OrgFeatures
}

export const DEFAULT_ORG_FEATURES: OrgFeatures = {
  user_badges: true,
  leaderboard: true,
  returning_signup_modal: true,
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  features: DEFAULT_ORG_FEATURES,
}

export function parseOrgSettings(raw: unknown): OrgSettings {
  const settings = raw as Partial<OrgSettings> | null
  const features = settings?.features as Partial<OrgFeatures> | null | undefined

  return {
    features: {
      user_badges: features?.user_badges !== false,
      leaderboard: features?.leaderboard !== false,
      returning_signup_modal: features?.returning_signup_modal !== false,
    },
  }
}

/** Safe accessor — handles stale cached org rows missing settings. */
export function orgSettings(org: { settings?: OrgSettings | null }): OrgSettings {
  return org.settings ?? DEFAULT_ORG_SETTINGS
}

export function orgFeatures(org: { settings?: OrgSettings | null }): OrgFeatures {
  return orgSettings(org).features
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
    description: 'Show the caps and streak leaderboard on public pages.',
  },
  {
    key: 'returning_signup_modal',
    label: 'Quick signup prompt',
    description:
      'Show returning participants a simplified one-tap signup modal before the full join form.',
  },
]
