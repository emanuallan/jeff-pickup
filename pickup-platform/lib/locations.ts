import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Location = {
  id: string
  org_id: string
  label: string
  address: string
  maps_url: string
  lat: number
  lon: number
  is_online: boolean
  meeting_url: string
  is_active: boolean
}

export const getLocationsForOrg = cache(async (orgId: string): Promise<Location[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as Location[]
})
