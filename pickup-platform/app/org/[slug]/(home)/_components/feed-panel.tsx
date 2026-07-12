import type { Org } from '@/lib/orgs'
import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import { OrgSessionFeedList } from '../../_components/feed-ui'

type Props = {
  org: Org
  items: OrgSessionFeedItem[]
}

export function FeedPanel({ org, items }: Props) {
  return <OrgSessionFeedList items={items} accent={org.branding.accent_color} />
}
