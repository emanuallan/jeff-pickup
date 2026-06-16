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
  min_players: number | null
  interval_weeks: number
  anchor_date: string
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

export function formatIntervalWeeks(weeks: number): string {
  if (weeks === 1) return 'Every week'
  return `Every ${weeks} weeks`
}

export function normalizeStartTime(t: string): string {
  return t.slice(0, 5)
}

export type ScheduleFormValues = {
  locationId: string
  title: string
  startTime: string
  timezone: string
  capacity: number | null
  minPlayers: number | null
  durationMin: number
  intervalWeeks: number
  byweekday: number[]
}

export function isStructuralScheduleChange(
  before: Pick<Schedule, 'byweekday' | 'start_time' | 'interval_weeks' | 'timezone'>,
  after: Pick<ScheduleFormValues, 'byweekday' | 'startTime' | 'intervalWeeks' | 'timezone'>,
): boolean {
  const sortedBefore = [...before.byweekday].sort((a, b) => a - b)
  const sortedAfter = [...after.byweekday].sort((a, b) => a - b)
  if (sortedBefore.length !== sortedAfter.length) return true
  if (sortedBefore.some((d, i) => d !== sortedAfter[i])) return true
  if (normalizeStartTime(before.start_time) !== after.startTime) return true
  if (before.interval_weeks !== after.intervalWeeks) return true
  if (before.timezone !== after.timezone) return true
  return false
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
