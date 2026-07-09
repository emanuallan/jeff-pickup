import { describe, expect, it } from 'vitest'
import { normalizeNanpNationalDigits, stripLeadingCallingCode } from './phone-dial'

describe('normalizeNanpNationalDigits', () => {
  it('drops a lone 1 because +1 is already selected', () => {
    expect(normalizeNanpNationalDigits('1')).toBe('')
  })

  it('strips a mistaken leading 1 as soon as the area code digit appears', () => {
    expect(normalizeNanpNationalDigits('12')).toBe('2')
    expect(normalizeNanpNationalDigits('1202')).toBe('202')
    expect(normalizeNanpNationalDigits('12025550101')).toBe('2025550101')
  })

  it('does not strip a leading 1 when the next digit cannot start an area code', () => {
    expect(normalizeNanpNationalDigits('10')).toBe('10')
    expect(normalizeNanpNationalDigits('11')).toBe('11')
  })

  it('caps at 10 national digits', () => {
    expect(normalizeNanpNationalDigits('202555010199')).toBe('2025550101')
  })
})

describe('stripLeadingCallingCode', () => {
  it('normalizes NANP input through normalizeNanpNationalDigits', () => {
    expect(stripLeadingCallingCode('US', '12025550101')).toBe('2025550101')
    expect(stripLeadingCallingCode('US', '2025550101')).toBe('2025550101')
  })
})
