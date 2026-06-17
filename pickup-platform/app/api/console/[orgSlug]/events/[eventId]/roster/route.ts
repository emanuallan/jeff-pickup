import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { getRosterWithContact } from '@/lib/signups'
import { rosterToCsv } from '@/lib/roster-csv'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    return new Response('Not found', { status: 404 })
  }

  const roster = await getRosterWithContact(event.id)
  const csv = rosterToCsv(roster)
  const dateSlug = event.starts_at.slice(0, 10)
  const filename = `${org.slug}-roster-${dateSlug}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
