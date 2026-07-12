import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import { getOrgSessionFeed } from '@/lib/org-session-feed.server'
import { OrgHomeContentLoading } from './org-home-content-loading'
import { FeedPanel } from './feed-panel'

async function FeedPanelLoader({ org }: { org: Org }) {
  const items = await getOrgSessionFeed(org.id)
  return <FeedPanel org={org} items={items} />
}

export function FeedPanelSection({ org }: { org: Org }) {
  return (
    <Suspense fallback={<OrgHomeContentLoading variant="feed" />}>
      <FeedPanelLoader org={org} />
    </Suspense>
  )
}
