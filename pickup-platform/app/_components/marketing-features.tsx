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

export type MarketingStep = {
  title: string
  description: string
}

/** Top organizer value props — surfaced on the home page. */
export const HOME_FEATURE_HIGHLIGHTS: MarketingFeature[] = [
  {
    icon: '📋',
    title: 'Live roster',
    description:
      'See who’s in, who’s on the way, and who brought a mate — everyone looks at the same list.',
  },
  {
    icon: '⚖️',
    title: 'Even sides',
    description:
      'Turn on teams and Organizr splits confirmed players into balanced sides before kick-off.',
  },
  {
    icon: '📅',
    title: 'Recurring schedules',
    description:
      'Set your weekly slot once. Sessions roll forward automatically for the next 30 days.',
  },
  {
    icon: '📊',
    title: 'Organizer console',
    description:
      'Contact details, capacity and waitlist, turnout trends, and a CSV export when you need it.',
  },
]

/** Three-step explainer on the home page. */
export const HOW_IT_WORKS: MarketingStep[] = [
  {
    title: 'Set your slot',
    description:
      'Add your pitch and your weekly kick-off time. Organizr keeps the next month of sessions on the calendar for you.',
  },
  {
    title: 'Share one link',
    description:
      'Drop your page in the group chat or stick a QR code on the fence. Players tap in from any phone — no app, no password.',
  },
  {
    title: 'Show up to a full side',
    description:
      'Watch the headcount fill in real time. You know you’ve got a game before you leave the house.',
  },
]

export const FEATURE_GROUPS: MarketingFeatureGroup[] = [
  {
    title: 'Know who’s playing',
    description: 'Replace the Sunday-morning group text with one roster everybody trusts.',
    features: [
      {
        icon: '✅',
        title: 'Live roster & headcount',
        description:
          'Confirmed players, guest counts, and spots left at a glance — updated the moment someone taps in or out.',
      },
      {
        icon: '🚗',
        title: 'Arrival status',
        description:
          'Players mark “on my way” or “running late” so you know who’s actually walking onto the pitch.',
      },
      {
        icon: '🎯',
        title: 'Capacity & minimum',
        description:
          'Set a cap and the minimum you need for a game. Sessions stay tentative until the numbers land, then flip to confirmed.',
      },
      {
        icon: '⏳',
        title: 'Waitlist',
        description:
          'Once you’re full, extra sign-ups queue up. Spots auto-fill in order the second someone drops out.',
      },
    ],
  },
  {
    title: 'Even sides, every week',
    description: 'No more counting bibs in the car park.',
    features: [
      {
        icon: '👕',
        title: 'Auto-balanced teams',
        description:
          'Choose two sides or more. Confirmed players are assigned as they join, so the split is done before you arrive.',
      },
      {
        icon: '🔀',
        title: 'Players can switch',
        description:
          'Friends who want to play together can move sides — or hit random and let the app decide.',
      },
      {
        icon: '🙌',
        title: 'Guests welcome',
        description:
          'Regulars can bring +1s without creating an account for them. Guest counts roll into the headcount and the sides.',
      },
      {
        icon: '⚡',
        title: 'One-tap rejoin',
        description:
          'Returning players get a one-tap sign-up prompt instead of retyping their name and number every week.',
      },
    ],
  },
  {
    title: 'Run the season, not the group chat',
    description: 'Set it up once, then let the schedule take care of itself.',
    features: [
      {
        icon: '🔁',
        title: 'Recurring schedules',
        description:
          'Define your weekly or custom cadence. Upcoming sessions materialize automatically in a rolling 30-day window.',
      },
      {
        icon: '➕',
        title: 'One-offs & cancellations',
        description:
          'Add a friendly or a tournament, or call off a single week for a waterlogged pitch, without touching the schedule.',
      },
      {
        icon: '📍',
        title: 'Pitches & venues',
        description:
          'Save your fields, courts, and turf with addresses and map links attached to every session page.',
      },
      {
        icon: '🌦️',
        title: 'Kick-off weather',
        description:
          'The forecast for your pitch at your start time, right on the session page — so the “are we still on?” texts stop.',
      },
    ],
  },
  {
    title: 'A proper home for your group',
    description: 'Something you’re happy to post publicly, not a spreadsheet link.',
    features: [
      {
        icon: '🌐',
        title: 'Your own subdomain',
        description:
          'Every group gets a public page at yourgroup.organizr.co — bookmarkable, shareable, no download required.',
      },
      {
        icon: '🎨',
        title: 'Your crest and colors',
        description:
          'Upload a logo, pick an accent color, and add your socials so the page looks like your club, not a generic tool.',
      },
      {
        icon: '📱',
        title: 'QR code',
        description:
          'Download or print a scannable code for flyers, team sheets, or a sign on the fence at your venue.',
      },
      {
        icon: '↗️',
        title: 'Share cards',
        description:
          'Generate a match-day graphic or post the link and get a rich preview with time, place, and headcount.',
      },
    ],
  },
  {
    title: 'Tools built for organizers',
    description: 'Everything behind the scenes when you need names, numbers, or a read on turnout.',
    features: [
      {
        icon: '👥',
        title: 'Roster with contact info',
        description:
          'Names and phone numbers for everyone signed up — visible only to you inside the console.',
      },
      {
        icon: '📥',
        title: 'CSV export',
        description:
          'Download a session roster or your full player list whenever you need it for your own records.',
      },
      {
        icon: '📈',
        title: 'Turnout analytics',
        description:
          'Page views, sign-up rate, how full each session ran, and who dropped — per session and week over week.',
      },
      {
        icon: '🔔',
        title: 'Organizer alerts',
        description:
          'Get notified when the roster moves so you’re not refreshing the page all afternoon.',
      },
      {
        icon: '📖',
        title: 'Group rules',
        description:
          'Require players to accept your rules — cleats, subs, no-show policy — before they can sign up.',
      },
      {
        icon: '📣',
        title: 'Session announcements',
        description:
          'Pin a note to any session: parking, gate codes, bring a dark shirt, or a last-minute pitch change.',
      },
    ],
  },
  {
    title: 'Keep regulars coming back',
    description: 'Optional competition and post-match features you can switch on or off in settings.',
    features: [
      {
        icon: '🏆',
        title: 'Caps leaderboard',
        description: 'Appearances ranked across the group — the season table for people who keep showing up.',
      },
      {
        icon: '🔥',
        title: 'Streaks & badges',
        description: 'Weekly streaks and milestone badges displayed right on the public roster.',
      },
      {
        icon: '⭐',
        title: 'MVP votes',
        description:
          'Players vote for the man of the match after the final whistle. Winners get a badge and a spot on the board.',
      },
      {
        icon: '🎬',
        title: 'Match feed',
        description:
          'Goals, assists, and MVP results post to a group feed your players can react to during the week.',
      },
      {
        icon: '👤',
        title: 'Player profiles',
        description:
          'Every regular gets a profile with their caps, streaks, and career stats for your group.',
      },
      {
        icon: '💬',
        title: 'Session feedback',
        description:
          'After the whistle, players rate the session. You see averages and comments in the console.',
      },
    ],
  },
]

export const PLAYER_NOTE =
  'Players join from any phone browser — tap in, mark “on my way”, or drop out when plans change. No app store, no password, nothing to install.'

export const OTHER_SPORTS_NOTE =
  'Built for pickup soccer, but nothing in Organizr is soccer-only. Basketball runs, volleyball nights, run clubs, and other recurring crews use the same schedule, roster, and teams tools.'

function FeatureCard({ icon, title, description }: MarketingFeature) {
  return (
    <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]">
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base leading-none"
          aria-hidden
        >
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

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <h2
        id="how-it-works-heading"
        className="text-sm font-semibold uppercase tracking-widest text-zinc-500"
      >
        How it works
      </h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {HOW_IT_WORKS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-sm font-semibold text-indigo-300">
              {index + 1}
            </span>
            <h3 className="mt-4 text-base font-semibold text-zinc-100">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function HomeFeatureHighlights() {
  return (
    <section aria-labelledby="home-features-heading">
      <h2
        id="home-features-heading"
        className="text-sm font-semibold uppercase tracking-widest text-zinc-500"
      >
        Built for organizers
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {HOME_FEATURE_HIGHLIGHTS.map((feature) => (
          <li key={feature.title}>
            <FeatureCard {...feature} />
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-zinc-500">
        <Link href="/features" className="text-indigo-300 transition-colors hover:text-indigo-200">
          Explore all features →
        </Link>
      </p>
    </section>
  )
}

export function FeaturesPageContent() {
  return (
    <div className="space-y-12">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-indigo-500/5 px-4 py-4">
          <h2 className="text-sm font-semibold text-indigo-200">For players</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{PLAYER_NOTE}</p>
        </section>
        <section className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">Not just soccer</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{OTHER_SPORTS_NOTE}</p>
        </section>
      </div>
    </div>
  )
}
