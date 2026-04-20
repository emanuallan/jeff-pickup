import { assertSupabaseConfigured } from '../../lib/supabase'
import type { LocationId } from '../signups/types'

export type ActiveTime = string

export async function fetchActiveLocation(): Promise<LocationId> {
  const sb = assertSupabaseConfigured()
  const { data, error } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'active_location')
    .maybeSingle()

  if (error) throw error
  const v = (data?.value ?? 'shirley_hall_park') as LocationId
  return v === 'poppy_park' ? 'poppy_park' : 'shirley_hall_park'
}

export async function setActiveLocation(location: LocationId): Promise<void> {
  const sb = assertSupabaseConfigured()
  const { error } = await sb.from('app_settings').upsert({
    key: 'active_location',
    value: location,
  })
  if (error) throw error
}

export async function fetchActiveTime(): Promise<ActiveTime> {
  const sb = assertSupabaseConfigured()
  const { data, error } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'active_time')
    .maybeSingle()

  if (error) throw error
  const v = String(data?.value ?? '18:00')
  return /^\d{2}:\d{2}$/.test(v) ? v : '18:00'
}

export async function setActiveTime(time: ActiveTime): Promise<void> {
  const sb = assertSupabaseConfigured()
  const { error } = await sb.from('app_settings').upsert({
    key: 'active_time',
    value: time,
  })
  if (error) throw error
}

