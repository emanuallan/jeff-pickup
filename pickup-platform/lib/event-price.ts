import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/public'
import { isPaidSession } from '@/lib/session-payment'

/**
 * Live session fee for join gating — uses SQL RPC (not cached PostgREST row shapes).
 * React.cache dedupes SessionPanel + EventParticipation within one request only.
 */
export const getLiveEventPriceCents = cache(
  async (orgId: string, eventRef: string): Promise<number | null> => {
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('get_event_price_cents', {
      p_org_id: orgId,
      p_event_ref: eventRef,
    })

    if (!error && data != null && Number.isFinite(Number(data))) {
      const cents = Number(data)
      return cents > 0 ? cents : null
    }

    // Fallback if RPC is not migrated yet — may miss the column until PostgREST reloads.
    const { data: row } = await supabase
      .from('events')
      .select('price_cents')
      .eq('org_id', orgId)
      .eq('short_id', eventRef)
      .maybeSingle()

    if (!row || row.price_cents == null) return null
    const cents = Number(row.price_cents)
    if (!Number.isFinite(cents) || cents <= 0) return null
    return cents
  },
)

export function paymentRequiredResult(priceCents: number | null | undefined): {
  error: string
  code: 'payment_required'
  priceCents?: number
} {
  const cents = isPaidSession(priceCents) ? Number(priceCents) : undefined
  return {
    error: 'This session requires payment.',
    code: 'payment_required',
    ...(cents != null ? { priceCents: cents } : {}),
  }
}
