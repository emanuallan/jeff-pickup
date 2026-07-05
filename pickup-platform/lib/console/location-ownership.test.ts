import { describe, expect, it, vi } from 'vitest'
import { assertLocationInOrg } from './location-ownership'

describe('assertLocationInOrg', () => {
  it('returns ok when the location belongs to the org', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'loc-1' }, error: null })
    const eqOrg = vi.fn().mockReturnValue({ maybeSingle })
    const eqId = vi.fn().mockReturnValue({ eq: eqOrg })
    const select = vi.fn().mockReturnValue({ eq: eqId })
    const supabase = {
      from: vi.fn().mockReturnValue({ select }),
    }

    const result = await assertLocationInOrg(supabase as never, 'org-1', 'loc-1')

    expect(result).toEqual({ ok: true })
    expect(supabase.from).toHaveBeenCalledWith('locations')
    expect(eqId).toHaveBeenCalledWith('id', 'loc-1')
    expect(eqOrg).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('returns an error when the location is missing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }

    const result = await assertLocationInOrg(supabase as never, 'org-1', 'loc-missing')

    expect(result).toEqual({ error: 'Location not found.' })
  })
})
