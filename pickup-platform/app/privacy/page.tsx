import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'
import { buildMarketingPageMetadata } from '@/lib/og-metadata'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/privacy',
  'Privacy Policy',
  'How Organizr collects, uses, and protects your information when you sign up for group sessions and use organizer tools.',
)

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy">
      <p className="text-sm text-zinc-500">Last updated: June 17, 2026</p>

      <p>
        Organizr (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates organizr.co and related
        subdomains where groups run sessions and participants sign up. This policy explains what
        we collect and how we use it.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Organizers</strong> who create a group sign in with email (passwordless magic
        link). We store your email and account information through our authentication provider.
      </p>
      <p>
        <strong>Participants</strong> who join a session may provide first name, last name, and
        phone number. A display name may be generated from your name. We use your phone number to
        identify you within a group so you can manage your own sign-ups across visits.
      </p>
      <p>
        <strong>Usage data</strong> includes page views on public event pages, anonymous visitor
        identifiers in cookies, and basic analytics to understand how the product is used. We also
        use cookies to remember your participant session on a device.
      </p>

      <h2>What others can see</h2>
      <p>
        Public session pages show a roster with display names, guest counts, and arrival status —
        not phone numbers or full contact details.
      </p>
      <p>
        Organizers of a group can see participant contact information (including phone numbers) for
        people signed up to their sessions, so they can run their group.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>Run sign-ups, rosters, and session management</li>
        <li>Remember returning participants on a device</li>
        <li>Provide organizers with attendance and engagement summaries</li>
        <li>Operate, secure, and improve the service</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We use third-party services to run Organizr, including Supabase (database and
        authentication) and Vercel (hosting and analytics). These providers process data on our
        behalf to deliver the service.
      </p>

      <h2>Retention</h2>
      <p>
        We keep information while your group is active and as needed to operate the service. If you
        want data removed, contact us and we will make reasonable efforts to delete or anonymize it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can leave a session at any time from the event page. To request deletion of your data
        or ask questions about this policy, contact{' '}
        <a href="https://aeserna.com" target="_blank" rel="noreferrer">
          Allan at aeserna.com
        </a>
        .
      </p>

      <h2>Children</h2>
      <p>
        Organizr is not directed at children under 13. We do not knowingly collect personal
        information from children.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. We will post the revised version on this page
        with an updated date.
      </p>

      <p>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
