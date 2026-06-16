import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import {
  getUpcomingEventsForOrg,
  formatEventTime,
  formatEventDayLabel,
  formatEventTimeOnly,
  statusLabel,
  type EventWithLocation,
} from '@/lib/events'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { readableTextColor } from '@/lib/colors'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { ShareButton } from '../share-button'
import { MoreSessions } from './more-sessions'
import { StatusPill, PinIcon, OnlineIcon, eventName } from './event-ui'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return {}
  }

  const events = await getUpcomingEventsForOrg(org.id, 1)
  const nextEvent = events[0]
  const activity = org.activity || 'group sessions'
  const title = org.name
  const description = nextEvent
    ? `Upcoming ${activity} with ${org.name}. Next up ${formatEventTime(nextEvent)} ${nextEvent.location_is_online ? 'on' : 'at'} ${nextEvent.location_label} — see who's coming and confirm you're in.`
    : `See the schedule of upcoming ${activity} with ${org.name}. Check who's coming and confirm you're in — it only takes a few seconds.`

  return buildOrgMetadata({
    slug,
    path: '/events',
    imagePath: '/events/og-image',
    title,
    description,
    siteName: org.name,
  })
}

/** Compact row used in the "more sessions" list. */
function SessionRow({
  event,
  fallbackName,
  accent,
}: {
  event: EventWithLocation
  fallbackName: string
  accent: string
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-100">
            {eventName(event, fallbackName)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">{formatEventDayLabel(event)}</span>
          <span>·</span>
          <span>{formatEventTimeOnly(event)}</span>
          <span className="truncate">· {event.location_label}</span>
        </div>
      </div>
      {event.status === 'on' ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-label={statusLabel(event.status)}
        />
      ) : null}
    </Link>
  )
}

export default async function EventsPage({ params }: Props) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const events = await getUpcomingEventsForOrg(org.id)
  const accent = org.branding.accent_color
  const fallbackName = org.activity || 'Session'

  const next = events[0]
  const rest = events.slice(1)
  const nextHeadcount = next ? rosterHeadcount(await getPublicRoster(next.id)) : 0
  const leaderboardUnlocked = await isLeaderboardUnlocked(org.id)

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">
      <div className="flex justify-end">
        <ShareButton title={org.name} text={`Join ${org.name} on Organizr`} />
      </div>

      <header className="mt-2 flex flex-col items-center text-center">
        {org.branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.branding.logo_url}
            alt=""
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold shadow-lg"
            style={{ backgroundColor: accent, color: readableTextColor(accent) }}
          >
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{org.name}</h1>
        {org.activity ? (
          <p className="mt-1.5 text-base text-zinc-400">{org.activity}</p>
        ) : null}
      </header>

      {next ? (
        <>
          <section className="mt-8">
            <Link
              href={`/events/${next.id}`}
              className="group block overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: accent }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: accent }}
                  >
                    Next session
                  </span>
                </span>
                <StatusPill status={next.status} accent={accent} />
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">
                {eventName(next, fallbackName)}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg font-medium text-zinc-100">
                  {formatEventDayLabel(next)}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-lg text-zinc-300">{formatEventTimeOnly(next)}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                {next.location_is_online ? <OnlineIcon /> : <PinIcon />}
                <span className="truncate">{next.location_label}</span>
              </div>

              {next.announcement ? (
                <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                  {next.announcement}
                </p>
              ) : null}

              <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                <span className="text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-100">{nextHeadcount}</span>
                  {next.capacity != null ? ` / ${next.capacity}` : ''} coming
                </span>
                <span
                  className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
                  style={{ color: accent }}
                >
                  Count me in →
                </span>
              </div>
            </Link>
          </section>

          {rest.length > 0 ? (
            <section className="mt-8">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                More sessions
              </h3>
              <MoreSessions count={rest.length} accent={accent}>
                <ul className="space-y-2.5">
                  {rest.map((ev) => (
                    <li key={ev.id}>
                      <SessionRow event={ev} fallbackName={fallbackName} accent={accent} />
                    </li>
                  ))}
                </ul>
              </MoreSessions>
            </section>
          ) : null}
        </>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No upcoming sessions scheduled yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Check back soon.</p>
        </section>
      )}

      {leaderboardUnlocked ? (
        <p className="mt-10 text-center">
          <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-zinc-200">
            View leaderboard →
          </Link>
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-zinc-600">
        {org.slug}.{getRootDomain()}
      </p>
    </main>
  )
}
