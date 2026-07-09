import { describe, expect, it } from 'vitest'
import type { PhoneCountry } from './phone.types'
import { maxNationalDigits } from './phone-dial'
import {
  editPhoneCountryField,
  editPhoneNationalField,
  formatNationalDisplay,
  formatUsNational,
  parseStoredPhoneDigits,
} from './phone-field'

const US_NATIONAL = '2025550101'
const US_E164 = `1${US_NATIONAL}`

describe('formatUsNational', () => {
    it('formats progressive US digits', () => {
    expect(formatUsNational('')).toBe('')
    expect(formatUsNational('2')).toBe('(2')
    expect(formatUsNational('20')).toBe('(20')
    expect(formatUsNational('202')).toBe('(202)')
    expect(formatUsNational('2025')).toBe('(202) 5')
    expect(formatUsNational('202555')).toBe('(202) 555')
    expect(formatUsNational('2025550')).toBe('(202) 555-0')
    expect(formatUsNational(US_NATIONAL)).toBe('(202) 555-0101')
  })

  it('caps at 10 digits', () => {
    expect(formatUsNational('20255501019999')).toBe('(202) 555-0101')
  })
})

describe('editPhoneNationalField', () => {
  describe('US typing', () => {
    it('accumulates digits one at a time', () => {
      let state: { country: PhoneCountry; national: string } = { country: 'US', national: '' }
      for (const digit of US_NATIONAL) {
        state = editPhoneNationalField(state, state.national + digit)
      }
      expect(state).toEqual({ country: 'US', national: US_NATIONAL })
    })

    it('ignores formatting characters pasted in', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '(202) 555-0101'),
      ).toEqual({ country: 'US', national: US_NATIONAL })
    })

    it('strips a leading +1 when US is selected', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '+1 202 555 0101'),
      ).toEqual({ country: 'US', national: US_NATIONAL })
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, US_E164),
      ).toEqual({ country: 'US', national: US_NATIONAL })
    })

    it('drops a lone leading 1 because +1 is already selected', () => {
      expect(editPhoneNationalField({ country: 'US', national: '' }, '1')).toEqual({
        country: 'US',
        national: '',
      })
    })

    it('does not jump when typing a mistaken leading 1 before a US number', () => {
      let state: { country: PhoneCountry; national: string } = { country: 'US', national: '' }
      const nationals: string[] = []
      for (const digit of '12025550101') {
        state = editPhoneNationalField(state, state.national + digit)
        nationals.push(state.national)
      }
      expect(nationals.every((value) => value.length <= 10)).toBe(true)
      expect(nationals).not.toContain('1202555010')
      expect(state).toEqual({ country: 'US', national: US_NATIONAL })
    })

    it('rejects invalid US numbers that start with 1 in the area code', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '1234567890'),
      ).toEqual({ country: 'US', national: '234567890' })
    })

    it('keeps a valid 447 area code without switching country', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '4475551234'),
      ).toEqual({ country: 'US', national: '4475551234' })
    })

    it('caps an accidental 11th digit on a 447 area code instead of switching country', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '4475551234' }, '44755512345'),
      ).toEqual({ country: 'US', national: '4475551234' })
    })

    it('caps extra digits at 10', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: US_NATIONAL }, `${US_NATIONAL}99`),
      ).toEqual({ country: 'US', national: US_NATIONAL })
    })
  })

  describe('US backspace through formatting', () => {
    it('removes a digit when backspace deletes only a parenthesis', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '202' }, '(202', { selectionStart: 5 }),
      ).toEqual({ country: 'US', national: '20' })
    })

    it('removes a digit when backspace deletes only the area-code close paren', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '2025' }, '(202) ', { selectionStart: 6 }),
      ).toEqual({ country: 'US', national: '202' })
    })

    it('removes a digit when backspace deletes only the dash', () => {
      expect(
        editPhoneNationalField(
          { country: 'US', national: '2025550' },
          '(202) 5550',
          { selectionStart: 10 },
        ),
      ).toEqual({ country: 'US', national: '202555' })
    })

    it('removes trailing digits on a normal backspace', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '2025' }, '(202) ', { selectionStart: 7 }),
      ).toEqual({ country: 'US', national: '202' })
    })

    it('walks back through a fully formatted number', () => {
      let state: { country: PhoneCountry; national: string } = { country: 'US', national: US_NATIONAL }
      const steps = [
        { value: '(202) 555-010', national: '202555010' },
        { value: '(202) 555-01', national: '20255501' },
        { value: '(202) 555-0', national: '2025550' },
        { value: '(202) 555', national: '202555' },
        { value: '(202) 55', national: '20255' },
        { value: '(202) 5', national: '2025' },
        { value: '(202)', national: '202' },
        { value: '(20', national: '20' },
        { value: '(2', national: '2' },
        { value: '', national: '' },
      ]

      for (const step of steps) {
        const formatted = formatNationalDisplay('US', state.national)
        const cursor = step.value.length
        state = editPhoneNationalField(state, step.value, { selectionStart: cursor })
        expect(state.national).toBe(step.national)
      }
    })
  })

  describe('international paste', () => {
    it('never auto-switches country when US is selected', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '447911123456'),
      ).toEqual({ country: 'US', national: '4479111234' })
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '593991234567'),
      ).toEqual({ country: 'US', national: '5939912345' })
    })

    it('strips a leading calling code for the selected country only', () => {
      expect(
        editPhoneNationalField({ country: 'GB', national: '' }, '447911123456'),
      ).toEqual({ country: 'GB', national: '7911123456' })
      expect(
        editPhoneNationalField({ country: 'EC', national: '' }, '593991234567'),
      ).toEqual({ country: 'EC', national: '991234567' })
    })

    it('caps extra digits for US instead of switching country', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: US_NATIONAL }, `${US_NATIONAL}99`),
      ).toEqual({ country: 'US', national: US_NATIONAL })
    })

    it('does not switch country for a partial foreign prefix', () => {
      expect(
        editPhoneNationalField({ country: 'US', national: '' }, '44791'),
      ).toEqual({ country: 'US', national: '44791' })
    })

    it('does not switch country when another country prefix is pasted', () => {
      expect(
        editPhoneNationalField({ country: 'GB', national: '' }, '593991234567'),
      ).toEqual({ country: 'GB', national: '593991234567'.slice(0, maxNationalDigits('GB')) })
    })
  })

  describe('non-US countries', () => {
    it('stores plain digits for international countries', () => {
      expect(formatNationalDisplay('GB', '7911123456')).toBe('7911123456')
    })

    it('strips the selected country calling code', () => {
      expect(
        editPhoneNationalField({ country: 'GB', national: '' }, '447911123456'),
      ).toEqual({ country: 'GB', national: '7911123456' })
    })

    it('caps by E.164 length for international countries', () => {
      expect(
        editPhoneNationalField({ country: 'GB', national: '' }, '79111234567890123'),
      ).toEqual({ country: 'GB', national: '7911123456789' })
    })
  })
})

describe('editPhoneCountryField', () => {
  it('keeps national digits when switching NANP countries', () => {
    expect(editPhoneCountryField('DO', US_NATIONAL)).toEqual({
      country: 'DO',
      national: US_NATIONAL,
    })
  })

  it('strips an incompatible calling code when switching countries', () => {
    expect(editPhoneCountryField('US', '447911123456')).toEqual({
      country: 'US',
      national: '4479111234',
    })
  })
})

describe('parseStoredPhoneDigits', () => {
  it('splits stored US E.164', () => {
    expect(parseStoredPhoneDigits(US_E164)).toEqual({
      country: 'US',
      national: US_NATIONAL,
    })
  })

  it('splits stored UK E.164', () => {
    expect(parseStoredPhoneDigits('447911123456')).toEqual({
      country: 'GB',
      national: '7911123456',
    })
  })

  it('returns defaults for empty input', () => {
    expect(parseStoredPhoneDigits('')).toEqual({ country: 'US', national: '' })
  })
})
