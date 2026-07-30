import { createClient } from '@/lib/supabase/server'

export type EventPaymentRow = {
  id: string
  event_id: string
  participant_id: string | null
  signup_id: string | null
  amount_cents: number
  currency: string
  status: string
  guest_count: number
  created_at: string
  completed_at: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

/** Org owner/admin RLS — payments for one session, with participant contact when linked. */
export async function getEventPaymentsForEvent(eventId: string): Promise<EventPaymentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_payments')
    .select(
      'id, event_id, participant_id, signup_id, amount_cents, currency, status, guest_count, created_at, completed_at, participants(display_name, first_name, last_name, phone)',
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    if (error) {
      console.error('getEventPaymentsForEvent failed', error.message)
    }
    return []
  }

  return data.map((row) => {
    const raw = row.participants
    const participant = (Array.isArray(raw) ? raw[0] : raw) as {
      display_name?: string | null
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
    } | null

    return {
      id: row.id as string,
      event_id: row.event_id as string,
      participant_id: (row.participant_id as string | null) ?? null,
      signup_id: (row.signup_id as string | null) ?? null,
      amount_cents: Number(row.amount_cents),
      currency: String(row.currency ?? 'usd'),
      status: String(row.status),
      guest_count: Number(row.guest_count ?? 0),
      created_at: String(row.created_at),
      completed_at: (row.completed_at as string | null) ?? null,
      display_name: participant?.display_name ?? null,
      first_name: participant?.first_name ?? null,
      last_name: participant?.last_name ?? null,
      phone: participant?.phone ?? null,
    }
  })
}
