import { createClient } from '@/lib/supabase/server'

export type Schedule = {
  id: string
  org_id: string
  location_id: string
  title: string
  byweekday: number[]
  start_time: string
  duration_min: number
  capacity: number | null
  min_players: number
  timezone: string
  is_active: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatWeekdays(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] ?? '?')
    .join(', ')
}

export function formatTime(t: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(t)
  if (!m) return t
  const h = Number.parseInt(m[1], 10)
  const min = m[2]
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${min} ${suffix}`
}

export async function getSchedulesForOrg(orgId: string): Promise<Schedule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as Schedule[]
}
