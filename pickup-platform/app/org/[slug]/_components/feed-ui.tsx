import type {
  OrgSessionFeedItem,
  OrgSessionFeedMvpItem,
  OrgSessionFeedPlayerStatsItem,
} from '@/lib/org-session-feed'
import {
  formatMvpFeedHeadline,
} from '@/lib/org-session-feed'
import { formatNotificationTime } from '@/lib/participant-notifications'
import { readableTextColor } from '@/lib/colors'

type Props = {
  items: OrgSessionFeedItem[]
  accent: string
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
}: {
  item: OrgSessionFeedItem
  accent: string
}) {
  if (item.kind === 'player_stats') {
    return <PlayerStatsCard item={item} />
  }

  return <MvpFeedCard item={item} accent={accent} />
}

function MvpFeedCard({ item, accent }: { item: OrgSessionFeedMvpItem; accent: string }) {
  const when = formatNotificationTime(item.occurred_at)
  const headline = formatMvpFeedHeadline(item)

  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4">
      <FeedKindBadge kind="mvp" />
      <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-100">{headline}</h3>
      <p className="mt-1 text-xs text-zinc-500">
        {item.event_label} · {when}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Vote breakdown
          {item.total_votes > 0 ? ` · ${item.total_votes} total` : ''}
        </p>
        <MvpNomineeList item={item} accent={accent} />
      </div>
    </article>
  )
}

function PlayerStatsCard({ item }: { item: OrgSessionFeedPlayerStatsItem }) {
  const when = formatNotificationTime(item.occurred_at)
  const statLine = formatPlayerStatsInline(item.goals, item.assists)

  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <FeedKindBadge kind="player_stats" />
          <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-100">
            {item.display_name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {item.event_label} · {when}
          </p>
        </div>

        {statLine ? (
          <p
            className="shrink-0 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-100 ring-1 ring-inset ring-emerald-500/20"
            aria-label={`${item.goals} goals, ${item.assists} assists`}
          >
            {statLine}
          </p>
        ) : null}
      </div>

      {!statLine ? (
        <p className="mt-2.5 text-sm text-zinc-500">No goals or assists this session.</p>
      ) : null}
    </article>
  )
}

function formatPlayerStatsInline(goals: number, assists: number): string | null {
  const parts: string[] = []
  if (goals > 0) parts.push(`${goals}G`)
  if (assists > 0) parts.push(`${assists}A`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function OrgSessionFeedList({ items, accent }: Props) {
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
          />
        ))}
      </div>
    </div>
  )
}
