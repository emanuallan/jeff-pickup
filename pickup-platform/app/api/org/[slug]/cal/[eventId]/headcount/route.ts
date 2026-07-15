import { getPublicOrgAndEvent, getPublicRosterLive, getPublicWaitlistLive } from '@/lib/public-data'
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

  const waitlistEnabled = result.event.capacity != null
  const [roster, waitlist] = await Promise.all([
    getPublicRosterLive(result.event.id),
    waitlistEnabled ? getPublicWaitlistLive(result.event.id) : Promise.resolve([]),
  ])

  return Response.json(
    {
      headcount: rosterHeadcount(roster),
      status: result.event.status,
      roster,
      waitlist,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
