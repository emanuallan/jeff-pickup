import { describe, expect, it } from 'vitest'
import { parseLocationFormData } from './parse-location-form'

describe('parseLocationFormData', () => {
  it('requires a location label', () => {
    const form = new FormData()
    form.set('label', '   ')
    expect(parseLocationFormData(form)).toEqual({ ok: false, error: 'Location name is required.' })
  })

  it('normalizes maps and meeting URLs to http(s)', () => {
    const form = new FormData()
    form.set('label', 'Main Field')
    form.set('maps_url', 'maps.google.com/example')
    form.set('meeting_url', 'https://meet.example.com/room')

    const parsed = parseLocationFormData(form)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.values.mapsUrl).toBe('https://maps.google.com/example')
    expect(parsed.values.meetingUrl).toBe('https://meet.example.com/room')
  })

  it('strips unsafe URL schemes', () => {
    const form = new FormData()
    form.set('label', 'Main Field')
    form.set('maps_url', 'javascript:alert(1)')
    form.set('meeting_url', 'data:text/html,hi')

    const parsed = parseLocationFormData(form)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.values.mapsUrl).toBe('')
    expect(parsed.values.meetingUrl).toBe('')
  })
})
