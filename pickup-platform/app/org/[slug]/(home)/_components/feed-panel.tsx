import type { Org } from '@/lib/orgs'
import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import { OrgSessionFeedList } from '../../_components/feed-ui'

type Props = {
  org: Org
  items: OrgSessionFeedItem[]
  canReact: boolean
}

export function FeedPanel({ org, items, canReact }: Props) {
  return (
    <OrgSessionFeedList
      items={items}
      accent={org.branding.accent_color}
      orgSlug={org.slug}
      canReact={canReact}
    />
  )
}
