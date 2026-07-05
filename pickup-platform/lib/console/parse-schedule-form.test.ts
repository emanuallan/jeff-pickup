import { describe, expect, it } from 'vitest'
import { parseScheduleFormData } from './parse-schedule-form'

function scheduleFormData(entries: Record<string, string | string[]>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item)
      }
    } else {
      formData.set(key, value)
    }
  }
  return formData
}

describe('parseScheduleFormData', () => {
  const valid = {
    location_id: 'loc-1',
    title: 'Weekly pickup',
    start_time: '18:00',
    timezone: 'America/New_York',
    duration_min: '90',
    interval_weeks: '1',
    byweekday: ['2', '4'],
  }

  it('parses a valid schedule form', () => {
    const result = parseScheduleFormData(scheduleFormData(valid))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.values.title).toBe('Weekly pickup')
    expect(result.values.byweekday).toEqual([2, 4])
    expect(result.values.intervalWeeks).toBe(1)
  })

  it('requires at least one weekday', () => {
    const result = parseScheduleFormData(
      scheduleFormData({ ...valid, byweekday: [] }),
    )
    expect(result).toEqual({ ok: false, error: 'Pick at least one day of the week.' })
  })

  it('rejects invalid interval weeks', () => {
    const result = parseScheduleFormData(
      scheduleFormData({ ...valid, interval_weeks: '0' }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Frequency must be between')
  })

  it('rejects min participants above capacity', () => {
    const result = parseScheduleFormData(
      scheduleFormData({
        ...valid,
        capacity: '8',
        min_players: '10',
      }),
    )
    expect(result).toEqual({
      ok: false,
      error: 'Min participants cannot exceed capacity.',
    })
  })
})
