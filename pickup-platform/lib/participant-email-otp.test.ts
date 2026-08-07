import { describe, expect, it } from 'vitest'
import {
  generateParticipantOtpCode,
  hashParticipantOtpCode,
  participantOtpHashesMatch,
} from './participant-email-otp'
import { OTP_LENGTH } from './login-otp'

describe('participant-email-otp', () => {
  it('generates zero-padded codes of OTP_LENGTH', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateParticipantOtpCode()
      expect(code).toHaveLength(OTP_LENGTH)
      expect(code).toMatch(/^\d+$/)
    }
  })

  it('hashes are stable for the same org/email/code and differ otherwise', () => {
    const a = hashParticipantOtpCode('org-1', 'Ada@Example.com', '123456')
    const b = hashParticipantOtpCode('org-1', 'ada@example.com', '123456')
    const c = hashParticipantOtpCode('org-1', 'ada@example.com', '000000')
    expect(participantOtpHashesMatch(a, b)).toBe(true)
    expect(participantOtpHashesMatch(a, c)).toBe(false)
  })
})
