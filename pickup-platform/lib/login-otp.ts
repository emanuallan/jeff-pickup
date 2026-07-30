/** Matches Supabase Auth → Providers → Email OTP length (we use 6). */
export const OTP_LENGTH = 6

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Lightweight format check for contact / Checkout prefill (not ownership proof). */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeLoginEmail(email)
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_LENGTH)
}

export function isCompleteOtp(value: string): boolean {
  return normalizeOtpInput(value).length === OTP_LENGTH
}
