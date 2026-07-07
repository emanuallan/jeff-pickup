export const GROUP_RULES_TEXT_MIN_LENGTH = 10
export const GROUP_RULES_TEXT_MAX_LENGTH = 10_000

export type OrgGroupRules = {
  text: string
  version: number
  last_enforced_at: string | null
}

export type GroupRulesStatus = {
  active: boolean
  needs_acceptance: boolean
  rules_version?: number
  rules_text?: string
}

export type GroupRulesAgreementRow = {
  participant_id: string | null
  phone: string
  display_name: string
  accepted_at: string
}

export function parseOrgGroupRules(raw: unknown): OrgGroupRules | null {
  const rules = raw as Partial<OrgGroupRules> | null | undefined
  if (!rules || typeof rules !== 'object') {
    return null
  }

  const text = typeof rules.text === 'string' ? rules.text.trim() : ''
  const version = Number.isFinite(rules.version) ? Math.max(0, Number(rules.version)) : 0
  const lastEnforced =
    typeof rules.last_enforced_at === 'string' && rules.last_enforced_at.length > 0
      ? rules.last_enforced_at
      : null

  if (!text && version === 0 && !lastEnforced) {
    return null
  }

  return {
    text,
    version,
    last_enforced_at: lastEnforced,
  }
}

export function orgGroupRules(
  settings: { group_rules?: OrgGroupRules | null } | null | undefined,
): OrgGroupRules | null {
  return parseOrgGroupRules(settings?.group_rules)
}

export function groupRulesActive(
  enabled: boolean,
  rules: OrgGroupRules | null | undefined,
): boolean {
  return enabled && !!rules?.text && (rules.version ?? 0) > 0
}

export function validateGroupRulesText(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.length < GROUP_RULES_TEXT_MIN_LENGTH) {
    return `Group rules must be at least ${GROUP_RULES_TEXT_MIN_LENGTH} characters.`
  }
  if (trimmed.length > GROUP_RULES_TEXT_MAX_LENGTH) {
    return `Group rules must be at most ${GROUP_RULES_TEXT_MAX_LENGTH.toLocaleString()} characters.`
  }
  return null
}

export function formatGroupRulesEnforcedAt(iso: string | null | undefined): string {
  if (!iso) {
    return 'Never'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Never'
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildNextGroupRulesOnSave(
  current: OrgGroupRules | null,
  nextText: string,
): OrgGroupRules {
  const trimmed = nextText.trim()
  // Text edits never bump version — only "Request re-acceptance" does.
  const version = Math.max(current?.version ?? 0, trimmed ? 1 : 0)

  return {
    text: trimmed,
    version,
    last_enforced_at: current?.last_enforced_at ?? null,
  }
}
