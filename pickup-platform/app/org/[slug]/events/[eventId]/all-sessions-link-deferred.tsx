import Link from 'next/link'
import { getPublicHasMultipleActiveUpcomingEvents } from '@/lib/public-data'

type Props = {
  orgId: string
}

/** Non-critical nav chrome — load after the event card shell. */
export async function AllSessionsLinkDeferred({ orgId }: Props) {
  const show = await getPublicHasMultipleActiveUpcomingEvents(orgId)
  if (!show) return null

  return (
    <Link
      href="/events"
      className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
    >
      <span aria-hidden>←</span> Home
    </Link>
  )
}
