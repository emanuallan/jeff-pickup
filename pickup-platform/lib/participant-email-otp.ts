import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { OTP_LENGTH } from '@/lib/login-otp'

export type ParticipantOtpPurpose = 'claim' | 'recover' | 'bind'

function otpSecret(): string {
  const secret = process.env.PARTICIPANT_OTP_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PARTICIPANT_OTP_SECRET is required')
  }
  // Local/dev fallback so Docker works without extra secrets.
  return process.env.CRON_SECRET?.trim() || 'local-participant-otp-dev-secret'
}

/** Cryptographically random 6-digit code (leading zeros allowed). */
export function generateParticipantOtpCode(): string {
  const max = 10 ** OTP_LENGTH
  return String(randomInt(0, max)).padStart(OTP_LENGTH, '0')
}

export function hashParticipantOtpCode(orgId: string, email: string, code: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  return createHmac('sha256', otpSecret())
    .update(`${orgId}:${normalizedEmail}:${code}`)
    .digest('hex')
}

export function participantOtpHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
