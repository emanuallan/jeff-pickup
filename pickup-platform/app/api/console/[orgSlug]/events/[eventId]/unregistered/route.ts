import { NextResponse } from 'next/server'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { getEventUnregisteredPeople } from '@/lib/event-analytics'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const people = await getEventUnregisteredPeople(event.id)
  return NextResponse.json({ people })
}
