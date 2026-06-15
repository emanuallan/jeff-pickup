import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime, statusLabel } from '@/lib/events'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { ShareButton } from '../share-button'

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
    ? `Upcoming ${activity} with ${org.name}. Next up ${formatEventTime(nextEvent)} at ${nextEvent.location_label} — see who's coming and confirm you're in.`
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

  const events = await getUpcomingEventsForOrg(org.id)
  const accent = org.branding.accent_color

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <header>
        {org.branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.branding.logo_url}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
            {org.activity ? (
              <p className="mt-1 text-sm text-zinc-400">{org.activity}</p>
            ) : null}
          </div>
          <ShareButton title={org.name} text={`Join ${org.name} on Headcount`} />
        </div>
      </header>

      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Upcoming sessions
        </h2>

        {events.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/events/${ev.id}`}
                  className="block rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        {formatEventTime(ev)}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">{ev.location_label}</div>
                    </div>
                    <span className="text-xs text-zinc-500">{statusLabel(ev.status)}</span>
                  </div>
                  {ev.announcement ? (
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{ev.announcement}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No upcoming sessions scheduled yet.
          </p>
        )}
      </section>

      <p className="mt-8 text-center">
        <Link
          href="/leaderboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          View leaderboard →
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-zinc-600">
        {org.slug}.{getRootDomain()}
      </p>
    </main>
  )
}
