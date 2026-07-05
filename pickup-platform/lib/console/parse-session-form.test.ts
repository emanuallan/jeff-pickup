import { describe, expect, it } from 'vitest'
import { parseSessionFormData } from './parse-session-form'

function sessionFormData(entries: Record<string, string | string[]>): FormData {
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

describe('parseSessionFormData', () => {
  const valid = {
    title: 'Thursday pickup',
    location_id: 'loc-1',
    starts_at: '2026-07-10T18:00',
    timezone: 'America/New_York',
    duration_min: '90',
  }

  it('parses a valid session form', () => {
    const result = parseSessionFormData(sessionFormData(valid))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.values.title).toBe('Thursday pickup')
    expect(result.values.locationId).toBe('loc-1')
    expect(result.values.durationMin).toBe(90)
    expect(result.values.startsAtIso).toBe('2026-07-10T22:00:00.000Z')
  })

  it('requires core fields', () => {
    const result = parseSessionFormData(sessionFormData({ ...valid, title: '' }))
    expect(result).toEqual({ ok: false, error: 'Session name, location, and date are required.' })
  })

  it('rejects invalid duration bounds', () => {
    const result = parseSessionFormData(sessionFormData({ ...valid, duration_min: '10' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Duration must be between')
  })

  it('rejects min participants above capacity', () => {
    const result = parseSessionFormData(
      sessionFormData({
        ...valid,
        capacity: '10',
        min_players: '12',
      }),
    )
    expect(result).toEqual({
      ok: false,
      error: 'Min participants cannot exceed capacity.',
    })
  })
})
