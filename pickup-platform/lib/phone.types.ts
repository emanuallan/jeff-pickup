import type { CountryCode } from 'libphonenumber-js'

export type PhoneCountry = CountryCode

export type PhoneCountryOption = {
  code: PhoneCountry
  dialCode: string
  label: string
  flag: string
}

export type PhoneCountryGroup = {
  label: string
  countries: PhoneCountryOption[]
}
