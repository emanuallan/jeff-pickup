/** Matches Supabase Auth → Providers → Email OTP length (we use 6). */
export const OTP_LENGTH = 6

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_LENGTH)
}

export function isCompleteOtp(value: string): boolean {
  return normalizeOtpInput(value).length === OTP_LENGTH
}
