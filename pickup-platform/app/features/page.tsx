import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from '../_components/organizr-shell'
import { MarketingFooter } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/features',
  'Features',
  'Organizr helps recurring groups share a link, collect sign-ups in a tap, and see who is coming — with schedules, rosters, and leaderboards built in. Free to use.',
)

const webFirstPoints = [
  {
    label: 'One link, any device',
    detail: 'Share in group chat — iPhone, Android, or laptop. No install step.',
  },
  {
    label: 'No another app',
    detail: 'Pickup players shouldn\u2019t need an app store trip just to say they\u2019re in.',
  },
  {
    label: 'Simplicity first',
    detail: 'Open the link, tap to join, see the roster. That\u2019s the whole product.',
  },
]

const playerFeatures = [
  'Sign up in a tap — name + phone, no account',
  'Live roster with headcount and capacity',
  'Arrival status — on my way, running late, etc.',
  'Bring guests; leave anytime on your own',
  'Recognized on return; recover via phone on a new device',
]

const organizerFeatures = [
  'Branded group site — logo, colors, social links',
  'Recurring schedules + one-off sessions',
  'In-person or online locations',
  'Capacity, minimums, tentative / on / cancelled',
  'Per-session announcements and share-ready pages',
  'Page views and signup analytics',
]

const communityFeatures = [
  { label: 'Caps', detail: 'Sessions attended' },
  { label: 'Streaks', detail: 'Weeks in a row' },
  { label: 'Leaderboard', detail: 'Unlocks with history' },
  { label: 'Badges', detail: 'On the roster' },
]

const matrixRows: {
  feature: string
  players: boolean
  organizers: boolean
  community: boolean
}[] = [
  { feature: 'Join & leave sessions', players: true, organizers: false, community: false },
  { feature: 'Live roster & headcount', players: true, organizers: true, community: false },
  { feature: 'Arrival status', players: true, organizers: false, community: false },
  { feature: 'Schedules & locations', players: false, organizers: true, community: false },
  { feature: 'Branding & announcements', players: false, organizers: true, community: false },
  { feature: 'Analytics', players: false, organizers: true, community: false },
  { feature: 'Caps, streaks & leaderboard', players: true, organizers: false, community: true },
]

const roadmapItems = [
  {
    title: 'Pay to join',
    detail: 'Optional drop-in fees per session',
  },
  {
    title: 'Members & alerts',
    detail: 'Opt-in updates by email or text',
  },
  {
    title: 'Smarter reminders',
    detail: 'Nudges before sessions you might miss',
  },
]

function Check() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-indigo-400" aria-hidden>
      ✓
    </span>
  )
}

function Dash() {
  return <span className="inline-block w-5 text-center text-zinc-700">—</span>
}

function FeatureCard({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-50">{title}</h2>
      {children}
    </section>
  )
}

export default function FeaturesPage() {
  const rootDomain = getRootDomain()
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            Built for recurring groups
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-400 sm:text-lg">
            Share a link. See who&apos;s coming. Run the schedule — free, in the browser, no app
            install.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Free', 'No app', 'Phone sign-up', `yourgroup.${rootDomain}`].map((pill) => (
              <li
                key={pill}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300"
              >
                {pill}
              </li>
            ))}
          </ul>
        </div>

        <FeatureCard eyebrow="Why web first" title="A link beats an app download" className="mt-10">
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We built Organizr for the group chat moment — someone drops a link, people tap it, and
            headcount is settled. A native app would add friction for occasional players and
            one-time guests. The web is the most universal way to sign up fast.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {webFirstPoints.map(({ label, detail }) => (
              <div
                key={label}
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-3"
              >
                <div className="text-sm font-semibold text-indigo-200">{label}</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{detail}</p>
              </div>
            ))}
          </div>
        </FeatureCard>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FeatureCard eyebrow="Players" title="Show up in seconds">
            <ul className="mt-4 space-y-2.5">
              {playerFeatures.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-zinc-400">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </FeatureCard>

          <FeatureCard eyebrow="Organizers" title="Run it from one console">
            <ul className="mt-4 space-y-2.5">
              {organizerFeatures.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-zinc-400">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </FeatureCard>
        </div>

        <FeatureCard eyebrow="Regulars" title="Friendly competition" className="mt-4">
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {communityFeatures.map(({ label, detail }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-center"
              >
                <div className="text-sm font-semibold text-zinc-100">{label}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{detail}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Cancelled sessions don&apos;t count toward caps or streaks.
          </p>
        </FeatureCard>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            At a glance
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-4 py-3 font-medium text-zinc-300">Feature</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-400">Players</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-400">Organizers</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-400">Regulars</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? 'bg-zinc-950/30' : 'bg-transparent'}
                  >
                    <td className="px-4 py-2.5 text-zinc-400">{row.feature}</td>
                    <td className="px-3 py-2.5 text-center">
                      {row.players ? <Check /> : <Dash />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.organizers ? <Check /> : <Dash />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.community ? <Check /> : <Dash />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              On the roadmap
            </h2>
            <span className="text-xs text-zinc-600">Not live yet</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {roadmapItems.map(({ title, detail }) => (
              <div
                key={title}
                className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
                  <span className="shrink-0 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Soon
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            Core headcount stays free — paid add-ons would be optional, not a paywall.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={`${organizrBtnPrimary} flex-1 text-center`}>
            Create your group
          </Link>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${organizrBtnSecondary} flex-1 text-center`}
          >
            Try the demo
          </a>
        </div>

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            ← Back to home
          </Link>
        </p>

        <MarketingFooter />
      </main>
    </div>
  )
}
