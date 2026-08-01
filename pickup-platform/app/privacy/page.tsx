import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'
import { buildMarketingPageMetadata } from '@/lib/og-metadata'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/privacy',
  'Privacy Policy',
  'How Organizr collects, uses, and protects your information when you join sessions, pay fees, sponsor a group, or use organizer tools.',
)

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy">
      <p className="text-sm text-zinc-500">Last updated: August 1, 2026</p>

      <p>
        Organizr (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates organizr.co and related
        subdomains where groups run sessions and participants sign up. This policy explains what
        we collect and how we use it.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Organizers</strong> who create a group sign in with email and a one-time code
        (no password). We store your email and account information through our authentication
        provider.
      </p>
      <p>
        <strong>Participants</strong> who join a session may provide first name, last name, and
        phone number. A display name may be generated from your name. We use your phone number to
        identify you within a group so you can manage your own sign-ups across visits. You may also
        optionally provide an email address (for example on your profile or when paying a session
        fee for a receipt).
      </p>
      <p>
        <strong>Sponsors</strong> who pay to support a group may provide a display name, logo,
        website link, and optional message. Payment details are collected and processed by Stripe;
        we do not store full card numbers.
      </p>
      <p>
        <strong>Usage data</strong> includes page views on public session pages, anonymous visitor
        identifiers in cookies, sponsor-logo click events, and basic analytics to understand how
        the product is used. We also use cookies to remember your participant session on a device.
      </p>
      <p>
        <strong>Optional engagement data</strong> may include post-session feedback ratings and
        comments, MVP votes, and similar activity you submit when those features are enabled for a
        group.
      </p>

      <h2>What others can see</h2>
      <p>
        Public session pages show a roster with display names, guest counts, arrival status, and —
        when enabled — team assignments and badges. They do not show phone numbers or full contact
        details.
      </p>
      <p>
        Organizers of a group can see participant contact information (including phone numbers, and
        email when provided) for people signed up to their sessions, so they can run their group.
        They can also export rosters and participant lists.
      </p>
      <p>
        Organizers can also see session engagement analytics in the console — for example, how many
        times a known participant viewed a session page, waitlist activity, and feedback summaries.
        Visitors who have not registered are counted anonymously and are not identified by name.
      </p>
      <p>
        When group sponsorships are enabled, sponsor names, logos, and links may appear on the
        group&apos;s public pages. Organizers can see sponsorship status and related visit or click
        summaries in the console.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>Run sign-ups, rosters, teams, waitlists, and session management</li>
        <li>Remember returning participants on a device</li>
        <li>Process session fees and sponsorships through Stripe when an organizer enables them</li>
        <li>Provide organizers with attendance, feedback, and engagement summaries</li>
        <li>Operate, secure, and improve the service</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Some groups may charge a per-session fee or offer paid sponsorships. Those payments are
        processed by Stripe on behalf of the organizer (Stripe Connect). Stripe may receive your
        name, email, and payment information as needed to complete checkout. Organizr receives
        payment status and related identifiers so we can confirm sign-ups and show organizers their
        payouts and sponsorships. Card numbers are handled by Stripe, not stored by Organizr.
      </p>

      <h2>Service providers</h2>
      <p>
        We use third-party services to run Organizr, including Supabase (database and
        authentication), Vercel (hosting and analytics), and Stripe (payments). These providers
        process data on our behalf to deliver the service.
      </p>

      <h2>Retention</h2>
      <p>
        We keep information while your group is active and as needed to operate the service,
        including payment records where required for accounting or dispute handling. If you want
        data removed, contact us and we will make reasonable efforts to delete or anonymize it,
        subject to legal and payment-processing retention needs.
      </p>

      <h2>Your choices</h2>
      <p>
        You can leave a session at any time from the session page (subject to any organizer rules
        for paid sessions). To request deletion of your data or ask questions about this policy,
        contact{' '}
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
