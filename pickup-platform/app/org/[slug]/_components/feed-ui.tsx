import Link from 'next/link'
import type {
  OrgSessionFeedItem,
  OrgSessionFeedMvpItem,
  OrgSessionFeedPlayerStatsItem,
} from '@/lib/org-session-feed'
import {
  formatMvpFeedHeadline,
} from '@/lib/org-session-feed'
import { formatNotificationTime } from '@/lib/participant-notifications'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { FeedReactions } from './feed-reactions'

type Props = {
  items: OrgSessionFeedItem[]
  accent: string
  orgSlug: string
  canReact: boolean
}

const statsCardClass =
  'overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40'

const mvpCardClass =
  'overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950'

function FeedKindBadge({ kind }: { kind: OrgSessionFeedItem['kind'] }) {
  if (kind === 'mvp') {
    return (
      <span className="inline-flex rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-inset ring-amber-500/20">
        MVP
      </span>
    )
  }

  return (
    <span
      className="inline-flex shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-200/90 ring-1 ring-inset ring-emerald-500/25"
      style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
    >
      Stats
    </span>
  )
}

function FeedEventLink({
  item,
  accent,
  className = '',
}: {
  item: OrgSessionFeedItem
  accent: string
  className?: string
}) {
  return (
    <Link
      href={orgPublicEventHref(item.event_short_id)}
      className={`truncate text-xs underline-offset-2 transition hover:underline ${className}`}
      style={{ color: accent }}
    >
      {item.event_label}
    </Link>
  )
}

function FeedSessionMeta({
  item,
  accent,
}: {
  item: OrgSessionFeedItem
  accent: string
}) {
  const when = formatNotificationTime(item.occurred_at)

  return (
    <div className="mt-1.5">
      <FeedEventLink item={item} accent={accent} className="block font-medium" />
      <p className="mt-0.5 text-xs text-zinc-600">{when}</p>
    </div>
  )
}

function MvpNomineeList({ nominees }: { nominees: OrgSessionFeedMvpItem['nominees'] }) {
  return (
    <ul className="space-y-2">
      {nominees.map((nominee) => (
        <li
          key={nominee.participant_id}
          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm"
        >
          <span className="truncate font-medium text-zinc-100">{nominee.display_name}</span>
          <span className="shrink-0 text-xs tabular-nums text-zinc-400">
            {nominee.vote_count} vote{nominee.vote_count === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function FeedCard({
  item,
  accent,
  orgSlug,
  canReact,
}: {
  item: OrgSessionFeedItem
  accent: string
  orgSlug: string
  canReact: boolean
}) {
  if (item.kind === 'player_stats') {
    return <PlayerStatsFeedCard item={item} accent={accent} orgSlug={orgSlug} canReact={canReact} />
  }

  return <MvpFeedCard item={item} accent={accent} orgSlug={orgSlug} canReact={canReact} />
}

function MvpFeedCard({
  item,
  accent,
  orgSlug,
  canReact,
}: {
  item: OrgSessionFeedMvpItem
  accent: string
  orgSlug: string
  canReact: boolean
}) {
  const headline = formatMvpFeedHeadline(item)
  const runnersUp = item.nominees.filter((nominee) => !nominee.is_winner)

  return (
    <article className={mvpCardClass}>
      <div className="px-4 py-4">
        <FeedKindBadge kind="mvp" />
        <h3 className="mt-2.5 text-base font-semibold leading-snug tracking-tight text-zinc-50">
          {headline}
        </h3>
        <FeedSessionMeta item={item} accent={accent} />

        {runnersUp.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Vote breakdown
              {item.total_votes > 0 ? ` · ${item.total_votes} total` : ''}
            </p>
            <MvpNomineeList nominees={runnersUp} />
          </div>
        ) : null}
      </div>

      <FeedReactions
        orgSlug={orgSlug}
        item={item}
        initialReactions={item.reactions}
        canReact={canReact}
        accent={accent}
      />
    </article>
  )
}

function PlayerStatsInline({
  goals,
  assists,
  accent,
}: {
  goals: number
  assists: number
  accent: string
}) {
  if (goals === 0 && assists === 0) {
    return <span className="text-xs text-zinc-500">0G · 0A</span>
  }

  return (
    <span className="shrink-0 text-sm font-semibold tabular-nums tracking-tight" aria-label={`${goals} goals, ${assists} assists`}>
      {goals > 0 ? (
        <span style={{ color: accent }}>{goals}G</span>
      ) : (
        <span className="text-zinc-600">0G</span>
      )}
      <span className="mx-1 text-zinc-700">·</span>
      {assists > 0 ? (
        <span style={{ color: accent }}>{assists}A</span>
      ) : (
        <span className="text-zinc-600">0A</span>
      )}
    </span>
  )
}

function PlayerStatsFeedCard({
  item,
  accent,
  orgSlug,
  canReact,
}: {
  item: OrgSessionFeedPlayerStatsItem
  accent: string
  orgSlug: string
  canReact: boolean
}) {
  const when = formatNotificationTime(item.occurred_at)

  return (
    <article className={statsCardClass}>
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <FeedKindBadge kind="player_stats" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-zinc-100">{item.display_name}</p>
              <PlayerStatsInline goals={item.goals} assists={item.assists} accent={accent} />
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <FeedEventLink item={item} accent={accent} className="min-w-0" />
              <time className="shrink-0 text-[11px] text-zinc-600" dateTime={item.occurred_at}>
                {when}
              </time>
            </div>
          </div>
        </div>
      </div>

      <FeedReactions
        orgSlug={orgSlug}
        item={item}
        initialReactions={item.reactions}
        canReact={canReact}
        accent={accent}
        compact
      />
    </article>
  )
}

export function OrgSessionFeedList({ items, accent, orgSlug, canReact }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-4 py-8 text-center">
        <p className="text-sm text-zinc-400">Nothing in the feed yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          MVP results and player stats will show up here after sessions wrap up.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedCard
          key={`${item.kind}-${item.event_id}-${item.kind === 'player_stats' ? item.participant_id : 'mvp'}-${item.occurred_at}`}
          item={item}
          accent={accent}
          orgSlug={orgSlug}
          canReact={canReact}
        />
      ))}
    </div>
  )
}
