import type {
  OrgSessionFeedItem,
  OrgSessionFeedMvpItem,
  OrgSessionFeedPlayerStatsItem,
} from '@/lib/org-session-feed'
import {
  formatMvpFeedHeadline,
  formatPlayerStatsFeedHeadline,
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
  const when = formatNotificationTime(item.occurred_at)
  const headline =
    item.kind === 'mvp'
      ? formatMvpFeedHeadline(item)
      : formatPlayerStatsFeedHeadline(item)

  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <FeedKindBadge kind={item.kind} />
          <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-100">{headline}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {item.event_label} · {when}
          </p>
        </div>
      </div>

      {item.kind === 'mvp' ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Vote breakdown
            {item.total_votes > 0 ? ` · ${item.total_votes} total` : ''}
          </p>
          <MvpNomineeList item={item} accent={accent} />
        </div>
      ) : (
        <PlayerStatsDetail item={item} />
      )}
    </article>
  )
}

function PlayerStatsDetail({ item }: { item: OrgSessionFeedPlayerStatsItem }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Goals</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{item.goals}</p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Assists</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{item.assists}</p>
      </div>
    </div>
  )
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
