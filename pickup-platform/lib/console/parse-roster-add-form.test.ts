import { describe, expect, it } from 'vitest'
import {
  parseRosterAddForm,
  parseRosterListStatusChoice,
  rosterListStatusForRpc,
} from './parse-roster-add-form'

describe('parse-roster-add-form', () => {
  it('parses a valid add form', () => {
    const form = new FormData()
    form.set('first_name', 'Alex')
    form.set('last_name', 'Morgan')
    form.set('phone', '(555) 123-4567')
    form.set('guest_count', '2')
    form.set('list_status', 'confirmed')

    const result = parseRosterAddForm(form, true)
    expect(result).toEqual({
      data: {
        phone: '5551234567',
        firstName: 'Alex',
        lastName: 'Morgan',
        displayName: null,
        guestCount: 2,
        listStatus: 'confirmed',
      },
    })
  })

  it('rejects invalid phone numbers', () => {
    const form = new FormData()
    form.set('first_name', 'Alex')
    form.set('last_name', 'Morgan')
    form.set('phone', '123')

    expect(parseRosterAddForm(form, true)).toEqual({
      error: 'Enter a valid 10-digit phone number.',
    })
  })

  it('maps auto list status to null for RPC', () => {
    expect(parseRosterListStatusChoice('auto')).toBe('auto')
    expect(rosterListStatusForRpc('auto')).toBeNull()
    expect(rosterListStatusForRpc('waitlisted')).toBe('waitlisted')
  })
})
