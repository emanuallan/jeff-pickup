import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime } from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter, LeaderboardLink } from '../_components/org-page-shell'
import { SocialLinks } from '../_components/social-links'
import { ShareButton } from '../share-button'
import { MoreSessions } from './more-sessions'
import {
  StatusPill,
  PinIcon,
  OnlineIcon,
  LiveDot,
  SessionRow,
  EventDateTimeRow,
  eventName,
  isEventCancelled,
  cancelledEventClasses,
} from '../_components/event-ui'

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

export default async function EventsPage({ params }: Props) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [events, leaderboardUnlocked] = await Promise.all([
    getUpcomingEventsForOrg(org.id, 20, true),
    isLeaderboardUnlocked(org.id),
  ])
  const accent = org.branding.accent_color
  const fallbackName = org.activity || 'Session'

  const next = events[0]
  const rest = events.slice(1)
  const nextCancelled = next ? isEventCancelled(next.status) : false
  const cancelledClasses = cancelledEventClasses(nextCancelled)
  const nextHeadcount = next ? rosterHeadcount(await getPublicRoster(next.id)) : 0

  return (
    <OrgPageShell>
      <div className="flex justify-end">
        <ShareButton title={org.name} text={`Join ${org.name} on Organizr`} />
      </div>

      <OrgHeader org={org} title={org.name} subtitle={org.activity} />

      {next ? (
        <>
          <section className="mt-8">
            <Link
              href={`/events/${next.id}`}
              className="group block overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {nextCancelled ? (
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Next session
                    </span>
                  ) : (
                    <>
                      <LiveDot accent={accent} />
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: accent }}
                      >
                        Next session
                      </span>
                    </>
                  )}
                </span>
                <StatusPill status={next.status} accent={accent} />
              </div>

              <h2 className={`mt-4 text-2xl font-semibold tracking-tight ${cancelledClasses.titleLg}`}>
                {eventName(next, fallbackName)}
              </h2>

              <EventDateTimeRow event={next} cancelled={nextCancelled} />

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
                {nextCancelled ? (
                  <>
                    <span className="text-sm text-red-400">This session was cancelled</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition-transform group-hover:translate-x-0.5">
                      View details →
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

      {leaderboardUnlocked ? <LeaderboardLink /> : null}
      <SocialLinks links={org.branding.links} />
      <OrgPageFooter slug={org.slug} />
    </OrgPageShell>
  )
}
