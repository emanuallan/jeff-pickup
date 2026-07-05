import { describe, expect, it } from 'vitest'
import {
  isCompleteOtp,
  normalizeLoginEmail,
  normalizeOtpInput,
  OTP_LENGTH,
} from './login-otp'

describe('login-otp', () => {
  it('normalizes email', () => {
    expect(normalizeLoginEmail('  User@Example.COM ')).toBe('user@example.com')
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
