import { NextResponse } from 'next/server'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { fetchEventAnalyticsDb } from '@/lib/event-analytics'
import {
  getAnalyticsDetail,
} from '@/lib/event-analytics-details'
import type { AnalyticsDetailMetric } from '@/lib/event-analytics-details.types'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

const METRICS: AnalyticsDetailMetric[] = [
  'page-views',
  'signup-funnel',
  'all-time-signups',
  'arrival-status',
  'guest-carriers',
  'capacity',
  'signup-timeline',
]

export async function GET(request: Request, { params }: Props) {
  const { orgSlug, eventId } = await params
  const metric = new URL(request.url).searchParams.get('metric') as AnalyticsDetailMetric | null

  if (!metric || !METRICS.includes(metric)) {
    return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
  }

  const org = await getOrgForMember(orgSlug)
  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = await fetchEventAnalyticsDb(event.id)
  const detail = await getAnalyticsDetail(metric, {
    eventId: event.id,
    timezone: event.timezone,
    capacity: event.capacity,
    minPlayers: event.min_players,
    isOnline: event.location_is_online,
    uniqueVisitors: db.uniqueVisitors,
    uniqueSignups: db.uniqueSignups,
  })

  return NextResponse.json(detail)
}
