import { PHONE_COUNTRIES } from './phone-countries'
import type { PhoneCountry } from './phone.types'

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = 'US'

/** E.164 allows at most 15 digits including the country calling code. */
export const E164_DIGIT_MAX = 15

/** NANP national numbers (US, Canada, Caribbean +1) are exactly 10 digits. */
export const NANP_NATIONAL_DIGIT_MAX = 10

/** Sorted longest-first so +593 matches before +59, etc. */
const DIAL_PREFIXES = [...PHONE_COUNTRIES]
  .map((entry) => ({ country: entry.code, dialCode: entry.dialCode }))
  .sort((a, b) => b.dialCode.length - a.dialCode.length)

const DIAL_CODE_BY_COUNTRY = new Map<PhoneCountry, string>(
  PHONE_COUNTRIES.map((entry) => [entry.code, entry.dialCode]),
)

export function stripDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function getDialCode(country: PhoneCountry): string {
  return DIAL_CODE_BY_COUNTRY.get(country) ?? '1'
}

/** Max national-number digits allowed while typing for a given country. */
export function maxNationalDigits(country: PhoneCountry): number {
  const callingCode = getDialCode(country)
  if (callingCode === '1') {
    return NANP_NATIONAL_DIGIT_MAX
  }
  return Math.max(1, E164_DIGIT_MAX - callingCode.length)
}

/** Find the best matching country for a full digit string (E.164 without '+'). */
export function matchCountryByDialPrefix(digits: string): PhoneCountry | null {
  for (const { country, dialCode } of DIAL_PREFIXES) {
    if (digits.startsWith(dialCode)) {
      const national = digits.slice(dialCode.length)
      if (national.length >= 1 && national.length <= maxNationalDigits(country)) {
        return country
      }
    }
  }
  return null
}

/** NANP area codes start with 2–9; a leading 1 is the +1 country code typed again by mistake. */
export function normalizeNanpNationalDigits(digits: string): string {
  if (!digits) {
    return ''
  }

  if (digits === '1') {
    return ''
  }

  let normalized = digits
  if (
    normalized.length >= 2 &&
    normalized.startsWith('1') &&
    normalized[1]! >= '2' &&
    normalized[1]! <= '9'
  ) {
    normalized = normalized.slice(1)
  }

  return normalized.slice(0, NANP_NATIONAL_DIGIT_MAX)
}

/** Remove a leading country calling code when the user typed it in the national field. */
export function stripLeadingCallingCode(country: PhoneCountry, digits: string): string {
  const callingCode = getDialCode(country)

  if (callingCode === '1' && digits.startsWith('1')) {
    return normalizeNanpNationalDigits(digits)
  }

  if (!digits.startsWith(callingCode)) {
    return digits
  }

  const national = digits.slice(callingCode.length)
  if (!national) {
    return digits
  }

  const maxNational = maxNationalDigits(country)

  if (national.length <= maxNational) {
    return national
  }

  return digits
}
