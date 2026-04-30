import { getSupabase } from './supabaseClient'

export type OmegaBallInterestSignup = {
  id: string
  name: string
  created_at: string
}

export async function fetchOmegaBallInterestSignups(): Promise<OmegaBallInterestSignup[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('omegaball_interest_signups')
    .select('id,name,created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as OmegaBallInterestSignup[]
}

export async function createOmegaBallInterestSignup(args: { name: string }): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('omegaball_interest_signups').insert({
    name: args.name,
  })
  if (error) throw error
}

