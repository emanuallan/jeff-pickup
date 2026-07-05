import {
  ADDITIONAL_INFORMATION_MAX_LENGTH,
  normalizeAdditionalInformation,
} from '@/lib/additional-information'
import type { ScheduleFormValues } from '@/lib/schedules'
import {
  parseOptionalInt,
  parseOptionalMinParticipants,
  validateCapacityVsMin,
} from './form-fields'
import { DEFAULT_EVENT_DURATION_MIN } from '@/lib/event-duration'

export function parseScheduleFormData(
  formData: FormData,
): { ok: true; values: ScheduleFormValues } | { ok: false; error: string } {
  const locationId = String(formData.get('location_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const startTime = String(formData.get('start_time') ?? '18:00')
  const timezone = String(formData.get('timezone') ?? 'UTC').trim()
  const capacity = parseOptionalInt(formData.get('capacity'))
  const minParticipants = parseOptionalMinParticipants(formData.get('min_players'))
  const durationMin = Number.parseInt(
    String(formData.get('duration_min') ?? String(DEFAULT_EVENT_DURATION_MIN)),
    10,
  )
  const intervalWeeks = Number.parseInt(String(formData.get('interval_weeks') ?? '1'), 10)
  const byweekday = formData
    .getAll('byweekday')
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => n >= 0 && n <= 6)

  if (!locationId) {
    return { ok: false, error: 'Pick a location.' }
  }
  if (!title) {
    return { ok: false, error: 'Enter a recurring session name.' }
  }
  if (byweekday.length === 0) {
    return { ok: false, error: 'Pick at least one day of the week.' }
  }
  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    return { ok: false, error: 'Invalid start time.' }
  }
  if (minParticipants.error) {
    return { ok: false, error: minParticipants.error }
  }
  const capacityError = validateCapacityVsMin(capacity, minParticipants.value)
  if (capacityError) {
    return { ok: false, error: capacityError }
  }
  if (!Number.isFinite(intervalWeeks) || intervalWeeks < 1 || intervalWeeks > 52) {
    return { ok: false, error: 'Frequency must be between every 1 and 52 weeks.' }
  }

  const additionalInformation = normalizeAdditionalInformation(
    formData.get('additional_information'),
  )
  if (additionalInformation.length > ADDITIONAL_INFORMATION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Additional information must be ${ADDITIONAL_INFORMATION_MAX_LENGTH} characters or fewer.`,
    }
  }

  return {
    ok: true,
    values: {
      locationId,
      title,
      startTime,
      timezone,
      capacity,
      minPlayers: minParticipants.value,
      durationMin,
      intervalWeeks,
      byweekday,
      additionalInformation,
    },
  }
}
