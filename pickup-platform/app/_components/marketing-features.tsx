import Link from 'next/link'

export type MarketingFeature = {
  icon: string
  title: string
  description: string
}

export type MarketingFeatureGroup = {
  title: string
  description: string
  features: MarketingFeature[]
}

/** Top organizer value props — surfaced on the home page. */
export const HOME_FEATURE_HIGHLIGHTS: MarketingFeature[] = [
  {
    icon: '📋',
    title: 'Live roster',
    description:
      'See who’s in, who’s on the way, and guest counts — everyone shares the same view.',
  },
  {
    icon: '📅',
    title: 'Recurring schedules',
    description:
      'Set your weekly cadence once. Sessions roll forward automatically for the next 30 days.',
  },
  {
    icon: '🔗',
    title: 'One link to share',
    description:
      'Your branded page at yourgroup.organizr.co — drop in chat, share, or print a QR code.',
  },
  {
    icon: '📊',
    title: 'Organizer console',
    description:
      'Rosters with contact info, CSV export, capacity & waitlist, and per-session stats.',
  },
]

export const FEATURE_GROUPS: MarketingFeatureGroup[] = [
  {
    title: 'Know who’s coming',
    description: 'Replace the group-text headcount with one live roster everyone trusts.',
    features: [
      {
        icon: '✅',
        title: 'Live roster & headcount',
        description:
          'Confirmed players, guest counts, and capacity at a glance — updated the moment someone joins or leaves.',
      },
      {
        icon: '🚗',
        title: 'Arrival status',
        description:
          'Players mark “on my way” or other statuses so you know who’s actually showing up.',
      },
      {
        icon: '🎯',
        title: 'Capacity & min players',
        description:
          'Set a cap and a minimum. Sessions stay tentative until enough people sign up, then flip to confirmed.',
      },
      {
        icon: '⏳',
        title: 'Waitlist',
        description:
          'When a session fills up, extra sign-ups join a waitlist. Spots auto-fill when someone drops.',
      },
    ],
  },
  {
    title: 'Run sessions without the spreadsheet',
    description: 'Set up once, then let recurring sessions generate themselves.',
    features: [
      {
        icon: '🔁',
        title: 'Recurring schedules',
        description:
          'Define your weekly or custom cadence. Upcoming sessions materialize automatically in a rolling 30-day window.',
      },
      {
        icon: '➕',
        title: 'One-off sessions',
        description:
          'Add a special game night or cancel a single date without touching the whole schedule.',
      },
      {
        icon: '📍',
        title: 'Locations',
        description:
          'Save fields, courts, or meetup spots with addresses and map links on every session page.',
      },
      {
        icon: '📣',
        title: 'Session announcements',
        description:
          'Pin a note to any session — parking updates, what to bring, or last-minute changes.',
      },
    ],
  },
  {
    title: 'Look professional, share anywhere',
    description: 'A branded home for your group that players can bookmark and reuse.',
    features: [
      {
        icon: '🌐',
        title: 'Your own subdomain',
        description:
          'Every group gets a public page at yourgroup.organizr.co — no app download required.',
      },
      {
        icon: '🎨',
        title: 'Branding',
        description:
          'Logo, accent color, and social links so your page feels like your group, not a generic tool.',
      },
      {
        icon: '📱',
        title: 'QR code',
        description:
          'Download or print a scannable code for flyers, posters, or signage at your venue.',
      },
      {
        icon: '↗️',
        title: 'Share-ready links',
        description:
          'Rich link previews when you post in group chat — time, place, and headcount at a glance.',
      },
    ],
  },
  {
    title: 'Tools built for organizers',
    description: 'Everything behind the scenes when you need names, numbers, or a pulse on turnout.',
    features: [
      {
        icon: '👥',
        title: 'Roster with contact info',
        description:
          'See names and phone numbers for everyone signed up — only visible to you in the console.',
      },
      {
        icon: '📥',
        title: 'CSV export',
        description:
          'Download session rosters or your full participant list for your own records.',
      },
      {
        icon: '📈',
        title: 'Session analytics',
        description:
          'Page views, sign-up rate, fill rate, and who left — useful after each session.',
      },
      {
        icon: '🔔',
        title: 'Organizer notifications',
        description:
          'Get notified when rosters change so you’re not refreshing the page all day.',
      },
    ],
  },
  {
    title: 'Keep regulars coming back',
    description: 'Optional engagement features you can turn on or off in settings.',
    features: [
      {
        icon: '🏆',
        title: 'Leaderboards',
        description: 'Caps and weekly streaks — friendly competition for your most dedicated players.',
      },
      {
        icon: '🔥',
        title: 'Roster badges',
        description: 'Milestone, streak, and caps badges on the public roster.',
      },
      {
        icon: '⚡',
        title: 'Quick rejoin',
        description:
          'Returning players get a one-tap sign-up prompt instead of retyping their info.',
      },
      {
        icon: '🌤️',
        title: 'Weather on session pages',
        description: 'Forecast for the session time and location — no extra setup.',
      },
    ],
  },
]

export const PLAYER_NOTE =
  'Players join from any phone browser — tap to sign up, update status, or unregister when plans change. No app store, no account password.'

function FeatureCard({ icon, title, description }: MarketingFeature) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4">
      <div className="flex gap-3">
        <span className="text-lg leading-none" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function HomeFeatureHighlights() {
  return (
    <section className="mt-10" aria-labelledby="home-features-heading">
      <h2 id="home-features-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Built for organizers
      </h2>
      <ul className="mt-4 space-y-3">
        {HOME_FEATURE_HIGHLIGHTS.map((feature) => (
          <li key={feature.title}>
            <FeatureCard {...feature} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href="/features" className="text-indigo-300 transition-colors hover:text-indigo-200">
          See all features →
        </Link>
      </p>
    </section>
  )
}

export function FeaturesPageContent() {
  return (
    <div className="space-y-10">
      <p className="text-base leading-relaxed text-zinc-400">
        Organizr replaces the weekly group-text headcount with a branded page, live roster, and a
        console built for people who run recurring groups — pickup sports, run clubs, meetups, and
        more.
      </p>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="text-lg font-semibold text-zinc-50">{group.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{group.description}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.features.map((feature) => (
              <li key={feature.title}>
                <FeatureCard {...feature} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-xl border border-white/10 bg-indigo-500/5 px-4 py-4">
        <h2 className="text-sm font-semibold text-indigo-200">For players</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{PLAYER_NOTE}</p>
      </section>
    </div>
  )
}
