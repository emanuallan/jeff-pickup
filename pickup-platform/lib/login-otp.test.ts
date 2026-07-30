import { describe, expect, it } from 'vitest'
import {
  isCompleteOtp,
  isValidEmail,
  normalizeLoginEmail,
  normalizeOtpInput,
  OTP_LENGTH,
} from './login-otp'

describe('login-otp', () => {
  it('normalizes email', () => {
    expect(normalizeLoginEmail('  User@Example.COM ')).toBe('user@example.com')
  })

  it('validates email format', () => {
    expect(isValidEmail('ada@example.com')).toBe(true)
    expect(isValidEmail('  Ada@Example.COM ')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('strips non-digits from OTP input', () => {
    expect(normalizeOtpInput('12-34 56')).toBe('123456')
  })

  it('caps OTP length', () => {
    expect(normalizeOtpInput('1234567890')).toHaveLength(OTP_LENGTH)
  })

  it('detects complete OTP', () => {
    expect(isCompleteOtp('123456')).toBe(true)
    expect(isCompleteOtp('12345')).toBe(false)
  })
})
