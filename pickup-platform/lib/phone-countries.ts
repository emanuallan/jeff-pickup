import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

import type { PhoneCountry, PhoneCountryGroup, PhoneCountryOption } from './phone.types'

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Minimum countries required before a continent gets its own optgroup. */
const MIN_CONTINENT_GROUP_SIZE = 3

/** Sovereign states in Latin America and the Caribbean. */
const LATIN_AMERICA_CODES: CountryCode[] = [
  'AG',
  'AR',
  'BB',
  'BO',
  'BR',
  'BS',
  'BZ',
  'CL',
  'CO',
  'CR',
  'CU',
  'DM',
  'DO',
  'EC',
  'GD',
  'GT',
  'GY',
  'HN',
  'HT',
  'JM',
  'KN',
  'LC',
  'MX',
  'NI',
  'PA',
  'PE',
  'PY',
  'SR',
  'SV',
  'TT',
  'UY',
  'VC',
  'VE',
]

/** Sovereign states in Africa (UN members). */
const AFRICA_CODES: CountryCode[] = [
  'AO',
  'BF',
  'BI',
  'BJ',
  'BW',
  'CD',
  'CF',
  'CG',
  'CI',
  'CM',
  'CV',
  'DJ',
  'DZ',
  'EG',
  'ER',
  'ET',
  'GA',
  'GH',
  'GM',
  'GN',
  'GQ',
  'GW',
  'KE',
  'KM',
  'LR',
  'LS',
  'LY',
  'MA',
  'MG',
  'ML',
  'MR',
  'MU',
  'MW',
  'MZ',
  'NA',
  'NE',
  'NG',
  'RW',
  'SC',
  'SD',
  'SL',
  'SN',
  'SO',
  'SS',
  'ST',
  'SZ',
  'TD',
  'TG',
  'TN',
  'TZ',
  'UG',
  'ZA',
  'ZM',
  'ZW',
]

const EUROPE_CODES: CountryCode[] = [
  'CH',
  'DE',
  'DK',
  'ES',
  'FR',
  'GB',
  'IE',
  'IT',
  'NL',
  'NO',
  'PL',
  'PT',
  'SE',
]

const ASIA_CODES: CountryCode[] = ['AE', 'IL', 'IN', 'JP', 'KR', 'PH', 'SG']

const OCEANIA_CODES: CountryCode[] = ['AU', 'NZ']

function countryLabel(code: CountryCode): string {
  if (code === 'US') {
    return 'US / Canada'
  }
  return displayNames.of(code) ?? code
}

function flagEmojiForCountry(code: CountryCode): string | null {
  // Regional Indicator Symbol Letters: 🇦 is U+1F1E6.
  // Works for ISO 3166-1 alpha-2 country codes.
  if (!/^[A-Z]{2}$/.test(code)) return null
  const A = 0x1f1e6
  const first = code.charCodeAt(0) - 65
  const second = code.charCodeAt(1) - 65
  if (first < 0 || first > 25 || second < 0 || second > 25) return null
  return String.fromCodePoint(A + first, A + second)
}

function buildOptions(codes: CountryCode[]): PhoneCountryOption[] {
  return codes
    .map((code) => {
      const flag = flagEmojiForCountry(code)
      if (!flag) return null
      return {
        code: code as PhoneCountry,
        dialCode: getCountryCallingCode(code),
        label: countryLabel(code),
        flag,
      }
    })
    .filter((entry): entry is PhoneCountryOption => entry != null)
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildContinentGroups(
  continents: { label: string; codes: CountryCode[] }[],
): PhoneCountryGroup[] {
  const groups: PhoneCountryGroup[] = []
  const otherCodes: CountryCode[] = []

  for (const continent of continents) {
    if (continent.codes.length >= MIN_CONTINENT_GROUP_SIZE) {
      groups.push({
        label: continent.label,
        countries: buildOptions(continent.codes),
      })
    } else {
      otherCodes.push(...continent.codes)
    }
  }

  if (otherCodes.length > 0) {
    groups.push({
      label: 'Other',
      countries: buildOptions(otherCodes),
    })
  }

  return groups
}

const US_OPTION: PhoneCountryOption = {
  code: 'US',
  dialCode: getCountryCallingCode('US'),
  label: 'US / Canada',
  flag: flagEmojiForCountry('US') ?? 'US',
}

export const PHONE_COUNTRY_GROUPS: PhoneCountryGroup[] = [
  {
    label: 'Latin America & Caribbean',
    countries: buildOptions(LATIN_AMERICA_CODES),
  },
  {
    label: 'Africa',
    countries: buildOptions(AFRICA_CODES),
  },
  ...buildContinentGroups([
    { label: 'Europe', codes: EUROPE_CODES },
    { label: 'Asia', codes: ASIA_CODES },
    { label: 'Oceania', codes: OCEANIA_CODES },
  ]),
]

/** Flat list for lookups — US first, then grouped countries. */
export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  US_OPTION,
  ...PHONE_COUNTRY_GROUPS.flatMap((group) => group.countries),
]

export const PHONE_COUNTRY_CODES = new Set(PHONE_COUNTRIES.map((entry) => entry.code))
