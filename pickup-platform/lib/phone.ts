/** Strip to digits only, drop a leading US country code, cap at 10 digits. */
export function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

/** Format up to 10 digits as (xxx) xxx-xxxx while the user types. */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function isValidPhoneDigits(digits: string): boolean {
  return digits.length === 10
}
