import { describe, expect, it } from 'vitest'
import { buildSponsorLogoPath, parseOurBucketSponsorLogoPath } from '@/lib/sponsor-logo'

describe('sponsor logo paths', () => {
  it('builds scoped storage paths', () => {
    const path = buildSponsorLogoPath(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'png',
    )
    expect(path).toMatch(/^sponsor-logos\/11111111/)
    expect(path).toMatch(/\.png$/)
  })

  it('parses our bucket sponsor logo URLs', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    const storagePath =
      'sponsor-logos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/logo_20260101120000_ab12cd.png'
    const url = `https://example.supabase.co/storage/v1/object/public/organizr_public/${storagePath}`
    expect(parseOurBucketSponsorLogoPath(url)).toBe(storagePath)
  })
})
