import { describe, expect, it } from 'vitest'
import { isMissingColumnError } from './missing-column'

describe('isMissingColumnError', () => {
  it('detects the Postgres undefined_column code', () => {
    expect(isMissingColumnError({ code: '42703', message: 'boom' })).toBe(true)
  })

  it('detects the PostgREST message when no code is present', () => {
    expect(
      isMissingColumnError({
        message: 'column event_roster_public.team does not exist',
      }),
    ).toBe(true)
  })

  it('ignores unrelated errors so real failures still surface', () => {
    expect(isMissingColumnError({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(isMissingColumnError({ message: 'relation does not exist' })).toBe(false)
    expect(isMissingColumnError(null)).toBe(false)
  })
})
