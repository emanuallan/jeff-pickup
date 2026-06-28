import { getPublicOrgAndEvent, getPublicRosterLive } from '@/lib/public-data'
import { rosterHeadcount } from '@/lib/signups'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { slug, eventId } = await params
  const result = await getPublicOrgAndEvent(slug, eventId)

  if (!result?.org || result.org.status !== 'active' || !result.event) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const roster = await getPublicRosterLive(result.event.id)

  return Response.json(
    { headcount: rosterHeadcount(roster), status: result.event.status },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
