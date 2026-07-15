import { getPublicOrgBySlug } from '@/lib/public-data'
import { isOrgSessionFeedEnabled } from '@/lib/org-session-feed'
import { getOrgSessionFeed } from '@/lib/org-session-feed.server'
import {
  SCROLLING_FEED_TICKER_LIMIT,
  buildScrollingFeedTickerItems,
} from '@/lib/scrolling-feed-update-bar'

type Props = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isOrgSessionFeedEnabled(org)) {
    return Response.json(
      { enabled: false },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      },
    )
  }

  const feedItems = await getOrgSessionFeed(org.id, SCROLLING_FEED_TICKER_LIMIT)
  const items = buildScrollingFeedTickerItems(feedItems).map((item) => ({
    id: item.id,
    kind: item.kind as 'mvp' | 'player_stats',
    headline: item.headline,
    eventShortId: item.eventShortId ?? '',
    dateLabel: item.dateLabel ?? '',
  }))

  return Response.json(
    { enabled: true, items },
    {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    },
  )
}
