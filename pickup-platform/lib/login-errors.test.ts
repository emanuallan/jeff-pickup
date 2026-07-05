import { describe, expect, it } from 'vitest'
import { loginErrorMessage, mapOtpAuthError } from './login-errors'

describe('login-errors', () => {
  describe('loginErrorMessage', () => {
    it('returns null for empty code', () => {
      expect(loginErrorMessage(null)).toBeNull()
      expect(loginErrorMessage(undefined)).toBeNull()
    })

    it('maps known auth error codes', () => {
      expect(loginErrorMessage('auth')).toContain('Sign-in failed')
    })

    it('returns generic message for unknown codes', () => {
      expect(loginErrorMessage('unknown')).toContain('Something went wrong')
    })
  })

  describe('mapOtpAuthError', () => {
    it('maps expired/invalid messages', () => {
      expect(mapOtpAuthError('Token has expired')).toContain('invalid or has expired')
    })

    it('maps rate limit messages', () => {
      expect(mapOtpAuthError('For security purposes, you can only request this once every 60 seconds')).toContain(
        'wait a moment',
      )
    })

    it('passes through unknown messages', () => {
      expect(mapOtpAuthError('Custom error')).toBe('Custom error')
    })
  })
})
