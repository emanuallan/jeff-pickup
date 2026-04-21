import { assertSupabaseConfigured } from '../lib/supabase'

export function getSupabase() {
  return assertSupabaseConfigured()
}

