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
      className="mr-auto inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
    >
      <span aria-hidden>←</span> Home
    </Link>
  )
}
