import {
  ADDITIONAL_INFORMATION_MAX_LENGTH,
  normalizeAdditionalInformation,
} from '@/lib/additional-information'
import {
  parseOptionalInt,
  parseOptionalMinParticipants,
  parseOptionalPriceCents,
  validateCapacityVsMin,
} from './form-fields'
import { localDateTimeInZoneToUtcIso } from '@/lib/datetime'
import {
  DEFAULT_EVENT_DURATION_MIN,
  MAX_EVENT_DURATION_MIN,
  MIN_EVENT_DURATION_MIN,
} from '@/lib/event-duration'
import {
  MAX_SESSION_TEAM_COUNT,
  MIN_SESSION_TEAM_COUNT,
  parseSessionTeamCount,
} from '@/lib/session-team'
import {
  parseSubmittedTeamColors,
  type SessionTeamColorSlug,
} from '@/lib/session-team-color'

export type ParsedSessionFields = {
  title: string
  locationId: string
  startsAtIso: string
  timezone: string
  durationMin: number
  capacity: number | null
  minPlayers: number | null
  additionalInformation: string
  priceCents: number | null
  /** Null = no teams for this session. Only meaningful when org team_selection is on. */
  teamCount: number | null
  teamColors: SessionTeamColorSlug[] | null
}

export function parseSessionFormData(
  formData: FormData,
): { ok: true; values: ParsedSessionFields } | { ok: false; error: string } {
  const title = String(formData.get('title') ?? '').trim()
  const locationId = String(formData.get('location_id') ?? '')
  const startsAtLocal = String(formData.get('starts_at') ?? '')
  const timezone = String(formData.get('timezone') ?? 'UTC').trim()
  const durationMin = Number.parseInt(
    String(formData.get('duration_min') ?? String(DEFAULT_EVENT_DURATION_MIN)),
    10,
  )
  const capacity = parseOptionalInt(formData.get('capacity'))
  const minParticipants = parseOptionalMinParticipants(formData.get('min_players'))
  const teamCountRaw = String(formData.get('team_count') ?? '').trim()
  let teamCount: number | null = null
  if (teamCountRaw) {
    const parsedTeams = parseSessionTeamCount(teamCountRaw)
    if (parsedTeams == null) {
      return {
        ok: false,
        error: `Teams must be between ${MIN_SESSION_TEAM_COUNT} and ${MAX_SESSION_TEAM_COUNT}, or left empty.`,
      }
    }
    teamCount = parsedTeams
  }
  const parsedColors = parseSubmittedTeamColors(formData.getAll('team_color'), teamCount)
  if (!parsedColors.ok) {
    return { ok: false, error: parsedColors.error }
  }
  const parsedPrice = parseOptionalPriceCents(formData.get('price_cents'))
  if (parsedPrice.error) {
    return { ok: false, error: parsedPrice.error }
  }
  const priceCents = parsedPrice.value

  const additionalInformation = normalizeAdditionalInformation(
    formData.get('additional_information'),
  )
  if (additionalInformation.length > ADDITIONAL_INFORMATION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Additional information must be ${ADDITIONAL_INFORMATION_MAX_LENGTH} characters or fewer.`,
    }
  }

  if (!title || !locationId || !startsAtLocal) {
    return { ok: false, error: 'Session name, location, and date are required.' }
  }
  if (
    !Number.isFinite(durationMin) ||
    durationMin < MIN_EVENT_DURATION_MIN ||
    durationMin > MAX_EVENT_DURATION_MIN
  ) {
    return {
      ok: false,
      error: `Duration must be between ${MIN_EVENT_DURATION_MIN} and ${MAX_EVENT_DURATION_MIN} minutes.`,
    }
  }
  if (minParticipants.error) {
    return { ok: false, error: minParticipants.error }
  }
  const capacityError = validateCapacityVsMin(capacity, minParticipants.value)
  if (capacityError) {
    return { ok: false, error: capacityError }
  }

  let startsAtIso: string
  try {
    startsAtIso = localDateTimeInZoneToUtcIso(startsAtLocal, timezone)
  } catch {
    return { ok: false, error: 'Invalid date or time.' }
  }

  return {
    ok: true,
    values: {
      title,
      locationId,
      startsAtIso,
      timezone,
      durationMin,
      capacity,
      minPlayers: minParticipants.value,
      additionalInformation,
      priceCents,
      teamCount,
      teamColors: parsedColors.colors,
    },
  }
}
