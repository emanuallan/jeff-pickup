import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js'

import { PHONE_COUNTRIES, PHONE_COUNTRY_CODES } from './phone-countries'
import type { PhoneCountry } from './phone.types'

export type { PhoneCountry, PhoneCountryGroup, PhoneCountryOption } from './phone.types'
export { PHONE_COUNTRIES, PHONE_COUNTRY_GROUPS, PHONE_COUNTRY_CODES } from './phone-countries'

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = 'US'

/** E.164 allows at most 15 digits including the country calling code. */
export const E164_DIGIT_MAX = 15

/** NANP national numbers (US, Canada, Caribbean +1) are exactly 10 digits. */
export const NANP_NATIONAL_DIGIT_MAX = 10

function stripDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Max national-number digits allowed while typing for a given country. */
export function maxNationalDigits(country: PhoneCountry): number {
  const callingCode = getCountryCallingCode(country)
  if (callingCode === '1') {
    return NANP_NATIONAL_DIGIT_MAX
  }
  return Math.max(1, E164_DIGIT_MAX - callingCode.length)
}

/** Strip non-digits and cap to the per-country national length. */
export function parseNationalInput(country: PhoneCountry, value: string): string {
  const digits = stripDigits(value)
  if (!digits) {
    return ''
  }
  return digits.slice(0, maxNationalDigits(country))
}

/** Map countries not listed in the dropdown to the closest selector entry. */
export function phoneCountryForSelect(country: PhoneCountry): PhoneCountry {
  if (country === 'CA') {
    return 'US'
  }
  if (PHONE_COUNTRY_CODES.has(country)) {
    return country
  }
  return DEFAULT_PHONE_COUNTRY
}

/** Combine country calling code with national digits → E.164 without '+'. */
export function normalizePhoneInput(country: PhoneCountry, national: string): string {
  const nationalDigits = parseNationalInput(country, national)
  if (!nationalDigits) {
    return ''
  }

  const callingCode = getCountryCallingCode(country)
  return `${callingCode}${nationalDigits}`
}

/**
 * Normalize stored/submitted phone values.
 * Transitional: bare 10-digit US numbers get a leading 1.
 */
export function normalizePhoneDigits(value: string): string {
  const digits = stripDigits(value)
  if (!digits) {
    return ''
  }
  if (digits.length === 10) {
    return `1${digits}`
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return digits
  }
  return digits
}

export function isValidPhoneDigits(e164: string): boolean {
  const normalized = normalizePhoneDigits(e164)
  if (!normalized) {
    return false
  }
  return isValidPhoneNumber(`+${normalized}`)
}

/** Format a stored E.164 value for display (console, roster). */
export function formatPhoneDisplay(e164: string): string {
  const normalized = normalizePhoneDigits(e164)
  if (!normalized) {
    return ''
  }

  try {
    const parsed = parsePhoneNumberWithError(`+${normalized}`)
    return parsed.formatInternational()
  } catch {
    return normalized
  }
}

/** Format national digits while the user types. */
export function formatNationalInput(country: PhoneCountry, nationalDigits: string): string {
  if (!nationalDigits) {
    return ''
  }
  return new AsYouType(country).input(nationalDigits)
}

/**
 * Derive national digits after an edit to a formatted phone field.
 * When backspace removes only formatting (e.g. ")" from "(202)"), stripDigits
 * leaves the digit count unchanged — remove the digit before the cursor instead.
 */
export function applyNationalInputChange(
  country: PhoneCountry,
  previousNational: string,
  nextFormattedValue: string,
  selectionStart?: number,
): string {
  const nextDigits = parseNationalInput(country, nextFormattedValue)
  if (nextDigits.length < previousNational.length) {
    return nextDigits
  }

  if (nextDigits.length === previousNational.length && previousNational.length > 0) {
    const previousFormatted = formatNationalInput(country, previousNational)
    if (nextFormattedValue.length < previousFormatted.length) {
      if (selectionStart !== undefined) {
        const digitsBeforeCursor = stripDigits(previousFormatted.slice(0, selectionStart)).length
        const deleteIndex = Math.max(0, digitsBeforeCursor - 1)
        return previousNational.slice(0, deleteIndex) + previousNational.slice(deleteIndex + 1)
      }
      return previousNational.slice(0, -1)
    }
  }

  return nextDigits
}

export function nationalDigitsOnly(value: string): string {
  return stripDigits(value)
}

/** Split a stored E.164 value for controlled phone inputs. */
export function parseStoredPhone(e164: string): { country: PhoneCountry; national: string } {
  const normalized = normalizePhoneDigits(e164)
  if (!normalized) {
    return { country: DEFAULT_PHONE_COUNTRY, national: '' }
  }

  try {
    const parsed = parsePhoneNumberWithError(`+${normalized}`)
    const country = phoneCountryForSelect((parsed.country ?? DEFAULT_PHONE_COUNTRY) as PhoneCountry)
    return {
      country,
      national: parsed.nationalNumber,
    }
  } catch {
    if (normalized.startsWith('1') && normalized.length === 11) {
      return { country: 'US', national: normalized.slice(1) }
    }
    return { country: DEFAULT_PHONE_COUNTRY, national: normalized }
  }
}

export function dialCodeForCountry(country: PhoneCountry): string {
  return `+${getCountryCallingCode(country)}`
}
