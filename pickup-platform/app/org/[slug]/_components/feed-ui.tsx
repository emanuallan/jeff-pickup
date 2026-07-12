import Link from 'next/link'
import type {
  OrgSessionFeedItem,
  OrgSessionFeedMvpItem,
  OrgSessionFeedPlayerStatsItem,
} from '@/lib/org-session-feed'
import {
  formatFeedItemDate,
  formatMvpFeedHeadline,
} from '@/lib/org-session-feed'
import { formatNotificationTime } from '@/lib/participant-notifications'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { readableTextColor } from '@/lib/colors'
import { FeedReactions } from './feed-reactions'

type Props = {
  items: OrgSessionFeedItem[]
  accent: string
  orgSlug: string
  canReact: boolean
}

function FeedKindBadge({ kind }: { kind: OrgSessionFeedItem['kind'] }) {
  if (kind === 'mvp') {
    return (
      <span className="inline-flex rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-inset ring-amber-500/20">
        MVP
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-inset ring-emerald-500/20">
      Stats
    </span>
  )
}

function FeedSessionLink({
  item,
  accent,
  className = 'mt-2',
}: {
  item: OrgSessionFeedItem
  accent: string
  className?: string
}) {
  const dateLabel = formatFeedItemDate(item.occurred_at)

  return (
    <p className={`min-w-0 text-xs leading-relaxed text-zinc-500 ${className}`}>
      <Link
        href={orgPublicEventHref(item.event_short_id)}
        className="font-medium underline-offset-2 transition hover:underline"
        style={{ color: accent }}
      >
        <span className="line-clamp-2">{item.event_label}</span>
      </Link>
      <span className="text-zinc-600"> ({dateLabel})</span>
    </p>
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
      <FeedSessionLink item={item} accent={accent} />
      <p className="mt-0.5 text-xs text-zinc-600">{when}</p>
    </div>
  )
}

function MvpNomineeList({ item, accent }: { item: OrgSessionFeedMvpItem; accent: string }) {
  if (item.nominees.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {item.total_votes === 0
          ? 'No votes were cast for this session.'
          : 'Vote breakdown is not available.'}
      </p>
    )
  }

  const accentFg = readableTextColor(accent)

  return (
    <ul className="space-y-2">
      {item.nominees.map((nominee) => (
        <li
          key={nominee.participant_id}
          className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm ${
            nominee.is_winner
              ? 'border-amber-500/25 bg-amber-500/5'
              : 'border-zinc-800 bg-zinc-900/40'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {nominee.is_winner ? (
              <span
                className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: accent, color: accentFg }}
              >
                MVP
              </span>
            ) : null}
            <span className="truncate font-medium text-zinc-100">{nominee.display_name}</span>
          </div>
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

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/70 to-zinc-950/50">
      <div className="px-4 py-4">
        <FeedKindBadge kind="mvp" />
        <h3 className="mt-2.5 text-base font-semibold leading-snug tracking-tight text-zinc-50">
          {headline}
        </h3>
        <FeedSessionMeta item={item} accent={accent} />

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Vote breakdown
            {item.total_votes > 0 ? ` · ${item.total_votes} total` : ''}
          </p>
          <MvpNomineeList item={item} accent={accent} />
        </div>
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

function PlayerStatsScoreBar({
  goals,
  assists,
  accent,
}: {
  goals: number
  assists: number
  accent: string
}) {
  return (
    <div
      className="grid grid-cols-2 overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/70"
      style={{ boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.04), 0 0 0 1px ${accent}24` }}
      aria-label={`${goals} goals, ${assists} assists`}
    >
      <div className="flex flex-col items-center border-r border-zinc-800/90 px-4 py-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Goals
        </span>
        <span
          className="mt-1 text-2xl font-bold tabular-nums leading-none"
          style={{ color: goals > 0 ? accent : '#52525b' }}
        >
          {goals}
        </span>
      </div>

      <div className="flex flex-col items-center px-4 py-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Assists
        </span>
        <span
          className="mt-1 text-2xl font-bold tabular-nums leading-none"
          style={{ color: assists > 0 ? accent : '#52525b' }}
        >
          {assists}
        </span>
      </div>
    </div>
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
  const hasStats = item.goals > 0 || item.assists > 0

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/70 to-zinc-950/50">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <FeedKindBadge kind="player_stats" />
          <time className="shrink-0 text-xs text-zinc-500" dateTime={item.occurred_at}>
            {when}
          </time>
        </div>

        <div className="mt-3">
          <p className="text-lg font-semibold tracking-tight text-zinc-50">{item.display_name}</p>
          <FeedSessionLink item={item} accent={accent} className="mt-1" />
          {!hasStats ? (
            <p className="mt-2 text-sm text-zinc-500">No goals or assists recorded.</p>
          ) : null}
        </div>
      </div>

      {hasStats ? (
        <div className="px-4 pb-4">
          <PlayerStatsScoreBar goals={item.goals} assists={item.assists} accent={accent} />
        </div>
      ) : null}

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

export function OrgSessionFeedList({ items, accent, orgSlug, canReact }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">Nothing in the feed yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          MVP results and player stats will show up here after sessions wrap up.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">Recent session highlights from your group.</p>
      <div className="space-y-4">
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
    </div>
  )
}
