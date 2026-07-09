import { PHONE_COUNTRIES, PHONE_COUNTRY_CODES } from './phone-countries'
import {
  DEFAULT_PHONE_COUNTRY,
  E164_DIGIT_MAX,
  NANP_NATIONAL_DIGIT_MAX,
  getDialCode,
  matchCountryByDialPrefix,
  maxNationalDigits,
  stripDigits,
  stripLeadingCallingCode,
} from './phone-dial'
import type { PhoneCountry } from './phone.types'
import {
  editPhoneCountryField,
  editPhoneNationalField,
  formatNationalDisplay,
  formatUsNational,
  parseStoredPhoneDigits,
  type PhoneFieldEditOptions,
  type PhoneFieldState,
} from './phone-field'

export type { PhoneCountry, PhoneCountryGroup, PhoneCountryOption } from './phone.types'
export { PHONE_COUNTRIES, PHONE_COUNTRY_GROUPS, PHONE_COUNTRY_CODES } from './phone-countries'
export {
  DEFAULT_PHONE_COUNTRY,
  E164_DIGIT_MAX,
  NANP_NATIONAL_DIGIT_MAX,
  getDialCode,
  maxNationalDigits,
  stripDigits,
}
export {
  editPhoneCountryField,
  editPhoneNationalField,
  formatNationalDisplay,
  formatUsNational,
  type PhoneFieldEditOptions,
  type PhoneFieldState,
}

/** NANP: area code and exchange cannot start with 0 or 1. */
const US_NANP_NATIONAL_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/

function isValidNanpNational(national: string): boolean {
  return national.length === NANP_NATIONAL_DIGIT_MAX && US_NANP_NATIONAL_REGEX.test(national)
}

/** Strip non-digits and cap to the per-country national length. */
export function parseNationalInput(country: PhoneCountry, value: string): string {
  const digits = stripDigits(value)
  if (!digits) {
    return ''
  }
  return stripLeadingCallingCode(country, digits).slice(0, maxNationalDigits(country))
}

/**
 * Resolve national digits from the phone field, switching country when the user
 * pastes or types a full international number (e.g. +44… while US is selected).
 */
export function parseNationalFieldInput(
  country: PhoneCountry,
  value: string,
): { country: PhoneCountry; national: string } {
  return editPhoneNationalField({ country, national: '' }, value)
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

  const callingCode = getDialCode(country)
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
  if (digits.length === 10 && isValidNanpNational(digits)) {
    return `1${digits}`
  }
  if (digits.length >= 11 && digits.length <= E164_DIGIT_MAX) {
    return digits
  }
  return digits
}

function isValidInternationalDigits(digits: string): boolean {
  if (digits.length < 11 || digits.length > E164_DIGIT_MAX) {
    return false
  }
  const country = matchCountryByDialPrefix(digits)
  if (!country) {
    return false
  }
  const dialCode = getDialCode(country)
  const national = digits.slice(dialCode.length)
  return national.length >= 6 && national.length <= maxNationalDigits(country)
}

export function isValidPhoneDigits(e164: string): boolean {
  const normalized = normalizePhoneDigits(e164)
  if (!normalized) {
    return false
  }

  if (normalized.startsWith('1') && normalized.length === 11) {
    return isValidNanpNational(normalized.slice(1))
  }

  if (normalized.length === 10 && isValidNanpNational(normalized)) {
    return true
  }

  return isValidInternationalDigits(normalized)
}

/** Format a stored E.164 value for display (console, roster). */
export function formatPhoneDisplay(e164: string): string {
  const normalized = normalizePhoneDigits(e164)
  if (!normalized) {
    return ''
  }

  if (normalized.startsWith('1') && normalized.length === 11) {
    return `+1 ${formatUsNational(normalized.slice(1))}`
  }

  const country = matchCountryByDialPrefix(normalized)
  if (country) {
    const dialCode = getDialCode(country)
    const national = normalized.slice(dialCode.length)
    return `+${dialCode} ${national}`
  }

  return `+${normalized}`
}

/** Format national digits while the user types. */
export function formatNationalInput(country: PhoneCountry, nationalDigits: string): string {
  return formatNationalDisplay(country, nationalDigits)
}

/**
 * Derive national digits after an edit to a formatted phone field.
 * @deprecated Prefer editPhoneNationalField — kept for backwards-compatible imports.
 */
export function applyNationalInputChange(
  country: PhoneCountry,
  previousNational: string,
  nextFormattedValue: string,
  selectionStart?: number,
): string {
  return editPhoneNationalField(
    { country, national: previousNational },
    nextFormattedValue,
    { selectionStart },
  ).national
}

export function nationalDigitsOnly(value: string): string {
  return stripDigits(value)
}

/** Split a stored E.164 value for controlled phone inputs. */
export function parseStoredPhone(e164: string): { country: PhoneCountry; national: string } {
  return parseStoredPhoneDigits(normalizePhoneDigits(e164))
}

export function dialCodeForCountry(country: PhoneCountry): string {
  return `+${getDialCode(country)}`
}

/** Label shown in the country-code select (flag + dial code). */
export function formatCountrySelectLabel(country: PhoneCountry): string {
  const entry = PHONE_COUNTRIES.find((c) => c.code === country) ?? PHONE_COUNTRIES[0]!
  return `${entry.flag} +${entry.dialCode}`
}
