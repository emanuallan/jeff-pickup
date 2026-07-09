import { describe, expect, it } from 'vitest'
import {
  assertTierCountLimit,
  parseSponsorshipTierFormData,
} from '@/lib/console/parse-sponsorship-tier-form'

function tierForm(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value)
  }
  return formData
}

describe('parseSponsorshipTierFormData', () => {
  it('parses valid tier fields', () => {
    const result = parseSponsorshipTierFormData(
      tierForm({
        name: 'Gold',
        description: 'Top tier',
        priceDollars: '25',
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values.priceCents).toBe(2500)
    }
  })

  it('rejects low prices', () => {
    const result = parseSponsorshipTierFormData(
      tierForm({
        name: 'Bronze',
        description: '',
        priceDollars: '2',
      }),
    )
    expect(result.ok).toBe(false)
  })
})

describe('assertTierCountLimit', () => {
  it('blocks when at max tiers', () => {
    expect(assertTierCountLimit(6)).toMatch(/at most/)
    expect(assertTierCountLimit(5)).toBeNull()
  })
})
