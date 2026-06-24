import { getOrgBySlug } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const roster = await getPublicRoster(event.id)

  return Response.json(
    { headcount: rosterHeadcount(roster), status: event.status },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
