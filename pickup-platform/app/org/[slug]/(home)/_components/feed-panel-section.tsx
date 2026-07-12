import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import { getOrgSessionFeed, hasParticipantFeedSession } from '@/lib/org-session-feed.server'
import { OrgHomeContentLoading } from './org-home-content-loading'
import { FeedPanel } from './feed-panel'

async function FeedPanelLoader({ org }: { org: Org }) {
  const [items, canReact] = await Promise.all([
    getOrgSessionFeed(org.id),
    hasParticipantFeedSession(org.id),
  ])

  return <FeedPanel org={org} items={items} canReact={canReact} />
}

export function FeedPanelSection({ org }: { org: Org }) {
  return (
    <Suspense fallback={<OrgHomeContentLoading variant="feed" />}>
      <FeedPanelLoader org={org} />
    </Suspense>
  )
}
