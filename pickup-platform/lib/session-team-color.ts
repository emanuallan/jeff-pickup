import { MAX_SESSION_TEAM_COUNT, MIN_SESSION_TEAM_COUNT } from '@/lib/session-team'

/** Main shirt colors — one unique option per team (max 8). */
export const SESSION_TEAM_COLORS = [
  { slug: 'white', label: 'White', hex: '#f8fafc' },
  { slug: 'black', label: 'Black', hex: '#18181b' },
  { slug: 'red', label: 'Red', hex: '#ef4444' },
  { slug: 'blue', label: 'Blue', hex: '#3b82f6' },
  { slug: 'green', label: 'Green', hex: '#22c55e' },
  { slug: 'yellow', label: 'Yellow', hex: '#eab308' },
  { slug: 'orange', label: 'Orange', hex: '#f97316' },
  { slug: 'purple', label: 'Purple', hex: '#a855f7' },
] as const

export type SessionTeamColorSlug = (typeof SESSION_TEAM_COLORS)[number]['slug']

const SLUGS = SESSION_TEAM_COLORS.map((c) => c.slug)
const BY_SLUG = new Map(SESSION_TEAM_COLORS.map((c) => [c.slug, c]))

export const SESSION_TEAM_COLOR_SLUGS: SessionTeamColorSlug[] = SLUGS

export function isSessionTeamColorSlug(value: unknown): value is SessionTeamColorSlug {
  return typeof value === 'string' && BY_SLUG.has(value as SessionTeamColorSlug)
}

export function sessionTeamColorLabel(slug: SessionTeamColorSlug): string {
  return BY_SLUG.get(slug)?.label ?? slug
}

export function sessionTeamColorHex(slug: SessionTeamColorSlug): string {
  return BY_SLUG.get(slug)?.hex ?? '#f8fafc'
}

export function defaultTeamColors(teamCount: number): SessionTeamColorSlug[] {
  const n = Math.min(MAX_SESSION_TEAM_COUNT, Math.max(0, Math.floor(teamCount)))
  return SLUGS.slice(0, n)
}

/** Fill / repair a color list so it has `teamCount` unique palette slugs. */
export function resizeTeamColors(
  existing: ReadonlyArray<unknown>,
  teamCount: number,
): SessionTeamColorSlug[] {
  const n = Math.min(MAX_SESSION_TEAM_COUNT, Math.max(0, Math.floor(teamCount)))
  const used = new Set<SessionTeamColorSlug>()
  const next: SessionTeamColorSlug[] = []

  for (let i = 0; i < n; i++) {
    const candidate = existing[i]
    if (isSessionTeamColorSlug(candidate) && !used.has(candidate)) {
      next.push(candidate)
      used.add(candidate)
      continue
    }
    const fallback = SLUGS.find((slug) => !used.has(slug))
    if (fallback) {
      next.push(fallback)
      used.add(fallback)
    }
  }

  return next
}

/**
 * Read stored jsonb / live-poll colors. Returns null when teams are off.
 * Mismatched or partial lists are repaired to unique defaults.
 */
export function parseTeamColors(
  raw: unknown,
  teamCount?: number | null,
): SessionTeamColorSlug[] | null {
  if (teamCount === null) return null
  const count =
    teamCount != null && Number.isInteger(teamCount)
      ? teamCount
      : Array.isArray(raw)
        ? raw.length
        : null
  if (count == null || count < MIN_SESSION_TEAM_COUNT || count > MAX_SESSION_TEAM_COUNT) {
    return null
  }
  return resizeTeamColors(Array.isArray(raw) ? raw : [], count)
}

export function assignTeamColor(
  colors: ReadonlyArray<SessionTeamColorSlug>,
  teamIndex: number,
  slug: SessionTeamColorSlug,
): SessionTeamColorSlug[] {
  if (teamIndex < 0 || teamIndex >= colors.length) return [...colors]
  if (colors.some((c, i) => i !== teamIndex && c === slug)) return [...colors]
  const next = [...colors]
  next[teamIndex] = slug
  return next
}

export function takenTeamColors(
  colors: ReadonlyArray<SessionTeamColorSlug>,
  teamIndex: number,
): Set<SessionTeamColorSlug> {
  const taken = new Set<SessionTeamColorSlug>()
  for (let i = 0; i < colors.length; i++) {
    if (i === teamIndex) continue
    const slug = colors[i]
    if (slug) taken.add(slug)
  }
  return taken
}

const DUPLICATE_COLOR_ERROR = 'Each team needs a different shirt color.'

/** Parse form `team_color` values submitted alongside a team count. */
export function parseSubmittedTeamColors(
  raw: ReadonlyArray<unknown>,
  teamCount: number | null,
): { ok: true; colors: SessionTeamColorSlug[] | null } | { ok: false; error: string } {
  if (teamCount == null) {
    return { ok: true, colors: null }
  }
  if (raw.length === 0) {
    return { ok: true, colors: defaultTeamColors(teamCount) }
  }
  if (raw.length !== teamCount) {
    return { ok: false, error: 'Pick a shirt color for each team.' }
  }

  const colors: SessionTeamColorSlug[] = []
  const seen = new Set<SessionTeamColorSlug>()
  for (const value of raw) {
    if (!isSessionTeamColorSlug(value)) {
      return { ok: false, error: 'Pick a shirt color for each team.' }
    }
    if (seen.has(value)) {
      return { ok: false, error: DUPLICATE_COLOR_ERROR }
    }
    seen.add(value)
    colors.push(value)
  }
  return { ok: true, colors }
}

export function sessionTeamHeading(
  team: number,
  color?: SessionTeamColorSlug | null,
): string {
  if (team < 1) return 'Unassigned'
  if (!color) return `Team ${team}`
  return `Team ${team} · ${sessionTeamColorLabel(color)}`
}

export function sessionTeamShirtHint(color: SessionTeamColorSlug): string {
  return `Bring a ${sessionTeamColorLabel(color).toLowerCase()} shirt`
}

export function teamColorColumns(
  teamCount: number | null,
  teamColors: SessionTeamColorSlug[] | null,
): { team_count: number | null; team_colors: SessionTeamColorSlug[] | null } {
  if (teamCount == null) return { team_count: null, team_colors: null }
  return { team_count: teamCount, team_colors: teamColors ?? defaultTeamColors(teamCount) }
}
