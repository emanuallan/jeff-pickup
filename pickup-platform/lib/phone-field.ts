import {
  DEFAULT_PHONE_COUNTRY,
  getDialCode,
  matchCountryByDialPrefix,
  maxNationalDigits,
  stripDigits,
  stripLeadingCallingCode,
} from './phone-dial'
import type { PhoneCountry } from './phone.types'

export type PhoneFieldState = {
  country: PhoneCountry
  national: string
}

export type PhoneFieldEditOptions = {
  /** Cursor index in the formatted input before the edit (for backspace-over-punctuation). */
  selectionStart?: number
}

/** Deterministic US display format: (202) 555-0101 */
export function formatUsNational(digits: string): string {
  const d = digits.slice(0, NANP_NATIONAL_DIGIT_MAX)
  if (!d) {
    return ''
  }
  if (d.length < 3) {
    return `(${d}`
  }
  if (d.length === 3) {
    return `(${d})`
  }
  if (d.length < 7) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`
  }
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const NANP_NATIONAL_DIGIT_MAX = 10

/** Format national digits for display while typing. US uses parentheses; others stay plain digits. */
export function formatNationalDisplay(country: PhoneCountry, nationalDigits: string): string {
  if (!nationalDigits) {
    return ''
  }
  if (getDialCode(country) === '1') {
    return formatUsNational(nationalDigits)
  }
  return nationalDigits.slice(0, maxNationalDigits(country))
}

/** Handle digit overflow and leading calling codes without changing the selected country. */
function handleDigitOverflow(
  selectedCountry: PhoneCountry,
  digits: string,
): PhoneFieldState | null {
  const maxSelected = maxNationalDigits(selectedCountry)
  if (digits.length <= maxSelected) {
    return null
  }

  const stripped = stripLeadingCallingCode(selectedCountry, digits)
  if (stripped.length <= maxSelected) {
    return { country: selectedCountry, national: stripped }
  }

  return { country: selectedCountry, national: stripped.slice(0, maxSelected) }
}

/**
 * Single entry point for national-field edits (typing, paste, backspace, delete).
 * Returns the next country + raw national digits to store.
 */
export function editPhoneNationalField(
  state: PhoneFieldState,
  rawValue: string,
  options: PhoneFieldEditOptions = {},
): PhoneFieldState {
  const rawDigits = stripDigits(rawValue)
  if (!rawDigits) {
    return { country: state.country, national: '' }
  }

  const overflow = handleDigitOverflow(state.country, rawDigits)
  if (overflow) {
    return overflow
  }

  let national = stripLeadingCallingCode(state.country, rawDigits)
  national = national.slice(0, maxNationalDigits(state.country))

  const previousFormatted = formatNationalDisplay(state.country, state.national)
  const deletedFormattingOnly =
    rawValue.length < previousFormatted.length &&
    national.length === state.national.length &&
    state.national.length > 0

  if (deletedFormattingOnly) {
    national = state.national.slice(0, -1)
  }

  return { country: state.country, national }
}

/** Clamp national digits when the user changes country in the selector. */
export function editPhoneCountryField(
  nextCountry: PhoneCountry,
  national: string,
): PhoneFieldState {
  return {
    country: nextCountry,
    national: stripLeadingCallingCode(nextCountry, stripDigits(national)).slice(
      0,
      maxNationalDigits(nextCountry),
    ),
  }
}

/** Split stored E.164 digits into selector country + national field value. */
export function parseStoredPhoneDigits(digits: string): PhoneFieldState {
  if (!digits) {
    return { country: DEFAULT_PHONE_COUNTRY, national: '' }
  }

  if (digits.startsWith('1') && digits.length === 11) {
    return { country: 'US', national: digits.slice(1) }
  }

  const matched = matchCountryByDialPrefix(digits)
  if (matched) {
    const dialCode = getDialCode(matched)
    return {
      country: matched,
      national: digits.slice(dialCode.length),
    }
  }

  return { country: DEFAULT_PHONE_COUNTRY, national: digits }
}
