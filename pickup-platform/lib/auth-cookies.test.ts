import { describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE } from './participant-session'
import { clearParticipantSession, getParticipantCookieOptions } from './auth-cookies'

describe('auth-cookies participant session', () => {
  it('expires hc_session with the same attributes used when setting it', () => {
    const set = vi.fn()
    const store = { set }

    clearParticipantSession(store)

    const expectedExpired = {
      ...getParticipantCookieOptions(),
      maxAge: 0,
      expires: expect.any(Date) as Date,
    }

    expect(set).toHaveBeenCalledWith(SESSION_COOKIE, '', expectedExpired)
    expect(set).toHaveBeenCalledTimes(1)
  })
})
