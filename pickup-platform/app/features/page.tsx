import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'
import { buildMarketingPageMetadata } from '@/lib/og-metadata'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/features',
  'Features',
  'Organizr helps recurring groups share a link, collect sign-ups in a tap, and see who is coming — with schedules, rosters, and leaderboards built in. Free to use.',
)

export default function FeaturesPage() {
  return (
    <MarketingPage title="Features">
      <p>
        Organizr is built for recurring group activities — pickup sports, run clubs, meetups, and
        anything else that meets on a schedule. It&apos;s <strong>free to use</strong>, works in the
        browser (no app to install), and gives every group its own link at{' '}
        <strong>yourgroup.organizr.co</strong>.
      </p>

      <h2>For participants</h2>
      <p>
        The goal is the same every time: open a link, say you&apos;re in, and see who else is
        coming. No account, no password — just a name and phone number so the group knows who you
        are and your device can remember you next time.
      </p>
      <ul>
        <li>
          <strong>Sign up in a tap</strong> — join the next session from your phone in seconds
        </li>
        <li>
          <strong>Live roster</strong> — see headcount, capacity, and who&apos;s on the list
        </li>
        <li>
          <strong>Arrival status</strong> — let the group know if you&apos;re on your way, running
          late, and so on
        </li>
        <li>
          <strong>Guests</strong> — bring a friend and count them toward the headcount
        </li>
        <li>
          <strong>Leave anytime</strong> — unregister yourself without bothering the organizer
        </li>
        <li>
          <strong>Come back easily</strong> — returning players are recognized; recover your spot
          on a new device with your phone number
        </li>
      </ul>

      <h2>For organizers</h2>
      <p>
        Run the group from a simple console: set where and when you meet, share one link, and
        let the roster update itself.
      </p>
      <ul>
        <li>
          <strong>Your own group site</strong> — branding, logo, accent color, and social links
        </li>
        <li>
          <strong>Recurring schedules</strong> — weekly or biweekly sessions materialize
          automatically; add one-off events when you need them
        </li>
        <li>
          <strong>Locations</strong> — in-person spots with maps, or online sessions with a meeting
          link
        </li>
        <li>
          <strong>Capacity &amp; minimums</strong> — optional caps and auto-promotion when enough
          people are in
        </li>
        <li>
          <strong>Session status</strong> — mark a session tentative, confirmed, or cancelled;
          cancelled sessions stay visible without cluttering the main schedule
        </li>
        <li>
          <strong>Announcements</strong> — post a note on a session (&ldquo;field 2 tonight&rdquo;,
          &ldquo;bring light and dark&rdquo;)
        </li>
        <li>
          <strong>Share-ready pages</strong> — link previews and a public schedule participants
          can bookmark
        </li>
        <li>
          <strong>Basic analytics</strong> — page views and signup activity so you know if people
          are seeing and using the link
        </li>
      </ul>

      <h2>For groups that show up often</h2>
      <p>
        When a community has enough history, Organizr surfaces a bit of friendly competition —
        without turning coordination into a chore.
      </p>
      <ul>
        <li>
          <strong>Caps</strong> — track how many sessions someone has attended
        </li>
        <li>
          <strong>Weekly streaks</strong> — see who keeps coming back week after week
        </li>
        <li>
          <strong>Leaderboard</strong> — unlocks once the group has a real track record; cancelled
          sessions don&apos;t count
        </li>
        <li>
          <strong>Roster badges</strong> — milestones and streaks show up next to names on the
          signup list
        </li>
      </ul>

      <h2>On the roadmap</h2>
      <p>
        These aren&apos;t live yet — they&apos;re the directions we&apos;re exploring as groups ask
        for more:
      </p>
      <ul>
        <li>
          <strong>Pay to join</strong> — optional session fees so organizers can collect drop-in
          payments when they need to
        </li>
        <li>
          <strong>Members &amp; alerts</strong> — participants who opt in to hear about upcoming
          sessions (email first; SMS for urgent updates like cancellations)
        </li>
        <li>
          <strong>Smarter reminders</strong> — nudges before a session, especially for regulars
          who haven&apos;t signed up yet
        </li>
      </ul>
      <p>
        Organizr stays free at its core. Paid features, if any, would be optional add-ons — not a
        paywall on basic headcount.
      </p>

      <p>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
