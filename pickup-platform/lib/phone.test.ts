import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_GROUPS,
  applyNationalInputChange,
  dialCodeForCountry,
  formatNationalInput,
  formatPhoneDisplay,
  isValidPhoneDigits,
  maxNationalDigits,
  nationalDigitsOnly,
  normalizePhoneDigits,
  normalizePhoneInput,
  parseNationalInput,
  parseStoredPhone,
  phoneCountryForSelect,
} from './phone'

/** Valid US fiction number (202-555-01XX). */
const US_TEST_E164 = '12025550101'
const US_TEST_NATIONAL = '2025550101'
const UK_TEST_E164 = '447911123456'

describe('phone', () => {
  describe('PHONE_COUNTRIES', () => {
    it('defaults to US first', () => {
      expect(PHONE_COUNTRIES[0]?.code).toBe('US')
      expect(DEFAULT_PHONE_COUNTRY).toBe('US')
    })

    it('includes all Latin American, Caribbean, and African countries', () => {
      const latinAmerica = PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Latin America & Caribbean')
      const africa = PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Africa')
      expect(latinAmerica?.countries).toHaveLength(33)
      expect(africa?.countries).toHaveLength(54)
    })

    it('splits remaining regions into continent groups with small regions under Other', () => {
      expect(PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Europe')?.countries).toHaveLength(13)
      expect(PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Asia')?.countries).toHaveLength(7)
      expect(PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Oceania')).toBeUndefined()
      expect(PHONE_COUNTRY_GROUPS.find((g) => g.label === 'Other')?.countries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'AU' }),
          expect.objectContaining({ code: 'NZ' }),
        ]),
      )
    })
  })

  describe('normalizePhoneInput', () => {
    it('combines US country code with national digits', () => {
      expect(normalizePhoneInput('US', US_TEST_NATIONAL)).toBe(US_TEST_E164)
    })

    it('combines UK country code with national digits', () => {
      expect(normalizePhoneInput('GB', '7911123456')).toBe(UK_TEST_E164)
    })

    it('strips formatting from national input', () => {
      expect(normalizePhoneInput('US', '(202) 555-0101')).toBe(US_TEST_E164)
    })
  })

  describe('normalizePhoneDigits', () => {
    it('prepends 1 to legacy 10-digit US numbers', () => {
      expect(normalizePhoneDigits(US_TEST_NATIONAL)).toBe(US_TEST_E164)
      expect(normalizePhoneDigits('(202) 555-0101')).toBe(US_TEST_E164)
    })

    it('keeps 11–15 digit E.164 values', () => {
      expect(normalizePhoneDigits(US_TEST_E164)).toBe(US_TEST_E164)
      expect(normalizePhoneDigits('+44 7911 123456')).toBe(UK_TEST_E164)
    })

    it('returns empty for blank input', () => {
      expect(normalizePhoneDigits('')).toBe('')
      expect(normalizePhoneDigits('   ')).toBe('')
    })
  })

  describe('isValidPhoneDigits', () => {
    it('accepts valid US E.164 numbers', () => {
      expect(isValidPhoneDigits(US_TEST_E164)).toBe(true)
      expect(isValidPhoneDigits(US_TEST_NATIONAL)).toBe(true)
    })

    it('accepts valid international numbers', () => {
      expect(isValidPhoneDigits(UK_TEST_E164)).toBe(true)
      expect(isValidPhoneDigits('525512345678')).toBe(true)
    })

    it('rejects too-short numbers', () => {
      expect(isValidPhoneDigits('123')).toBe(false)
      expect(isValidPhoneDigits('555123456')).toBe(false)
    })
  })

  describe('formatPhoneDisplay', () => {
    it('formats stored US numbers internationally', () => {
      expect(formatPhoneDisplay(US_TEST_E164)).toBe('+1 202 555 0101')
    })

    it('formats stored UK numbers internationally', () => {
      expect(formatPhoneDisplay(UK_TEST_E164)).toBe('+44 7911 123456')
    })

    it('returns empty string for empty input', () => {
      expect(formatPhoneDisplay('')).toBe('')
    })
  })

  describe('formatNationalInput', () => {
    it('formats US national digits while typing', () => {
      expect(formatNationalInput('US', '202555')).toBe('(202) 555')
    })
  })

  describe('applyNationalInputChange', () => {
    it('removes a digit when backspace deletes only formatting', () => {
      expect(applyNationalInputChange('US', '202', '(202', 5)).toBe('20')
    })

    it('removes digits when the edited value contains fewer digits', () => {
      expect(applyNationalInputChange('US', '202', '(02)', 2)).toBe('02')
      expect(applyNationalInputChange('US', '202', '(2)', 2)).toBe('2')
    })

    it('still removes trailing digits on a normal backspace', () => {
      expect(applyNationalInputChange('US', '2025', '(202) ', 7)).toBe('202')
    })
  })

  describe('parseStoredPhone', () => {
    it('splits stored US E.164 into country and national', () => {
      expect(parseStoredPhone(US_TEST_E164)).toEqual({
        country: 'US',
        national: US_TEST_NATIONAL,
      })
    })

    it('maps Canadian numbers to the US +1 selector', () => {
      expect(phoneCountryForSelect('CA')).toBe('US')
    })

    it('returns defaults for empty input', () => {
      expect(parseStoredPhone('')).toEqual({
        country: 'US',
        national: '',
      })
    })
  })

  describe('parseNationalInput', () => {
    it('caps US numbers at 10 national digits', () => {
      expect(parseNationalInput('US', '20255501019999')).toBe('2025550101')
      expect(maxNationalDigits('US')).toBe(10)
    })

    it('caps international numbers by E.164 length', () => {
      expect(maxNationalDigits('GB')).toBe(13)
      expect(parseNationalInput('GB', '79111234567890123')).toBe('7911123456789')
    })

    it('caps NANP Caribbean numbers at 10 national digits', () => {
      expect(maxNationalDigits('DO')).toBe(10)
      expect(parseNationalInput('DO', '80955512345678')).toBe('8095551234')
    })
  })

  describe('nationalDigitsOnly', () => {
    it('strips non-digits', () => {
      expect(nationalDigitsOnly('(202) 555-0101')).toBe(US_TEST_NATIONAL)
    })
  })

  describe('dialCodeForCountry', () => {
    it('returns calling code with plus', () => {
      expect(dialCodeForCountry('US')).toBe('+1')
      expect(dialCodeForCountry('GB')).toBe('+44')
    })
  })
})
