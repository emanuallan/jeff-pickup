import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'
import { buildMarketingPageMetadata } from '@/lib/og-metadata'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/terms',
  'Terms of Service',
  'Terms for using Organizr to run recurring sessions, manage sign-ups, charge session fees, and publish public group pages.',
)

export default function TermsPage() {
  return (
    <MarketingPage title="Terms of Service">
      <p className="text-sm text-zinc-500">Last updated: August 1, 2026</p>

      <p>
        By using Organizr at organizr.co and related subdomains, you agree to these terms. If you
        do not agree, please do not use the service.
      </p>

      <h2>The service</h2>
      <p>
        Organizr helps groups schedule recurring sessions and track who is attending. Features may
        include public signup pages, live rosters, waitlists, teams, feedback, and optional paid
        session fees or group sponsorships. We provide the platform; organizers are responsible for
        their groups, sessions, pricing, and how they use participant information.
      </p>

      <h2>Accounts and access</h2>
      <p>
        Organizers must provide accurate information when creating a group. You are responsible for
        activity under your account. Keep access to your organizer console secure.
      </p>
      <p>
        Participants join sessions by providing basic contact information. You agree to provide
        accurate information and only sign up for sessions you intend to attend.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Organizr for unlawful, harmful, or abusive purposes</li>
        <li>Harass others or impersonate someone else</li>
        <li>Scrape, overload, or attempt to disrupt the service</li>
        <li>Collect or misuse participant data beyond running your group</li>
        <li>Abuse payments, sponsorships, or refunds (including fraudulent chargebacks)</li>
      </ul>

      <h2>Organizer responsibilities</h2>
      <p>
        If you run a group on Organizr, you are responsible for informing your participants how you
        use their information, responding to their questions, and using contact details only for
        legitimate group-related purposes. You are also responsible for the accuracy of session
        details, capacity rules, announcements, and any group rules you require participants to
        accept.
      </p>

      <h2>Payments and sponsorships</h2>
      <p>
        Some organizers may charge a fee to join a session or offer paid sponsorships. Fees and
        sponsorship amounts are set by the organizer. Payments are processed by Stripe on the
        organizer&apos;s connected account. Organizr may collect a platform fee where disclosed at
        checkout or in the organizer console.
      </p>
      <p>
        Organizers are responsible for describing what participants or sponsors receive, handling
        refunds and disputes in good faith, and complying with applicable tax and consumer laws.
        Organizr is not a party to the underlying session fee or sponsorship agreement between an
        organizer and a participant or sponsor.
      </p>
      <p>
        Paid session sign-ups and sponsorships may be subject to Stripe&apos;s terms in addition to
        these terms. If a payment fails, is refunded, or is reversed, related access or roster
        status may be updated accordingly.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Organizr is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
        guarantee uninterrupted or error-free service. Session details, headcounts, schedules,
        weather information, and payments are managed by organizers, participants, and third-party
        providers — we are not responsible for cancellations, no-shows, disputes within a group, or
        payment outcomes between organizers and participants or sponsors.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Organizr and its operators will not be liable for
        indirect, incidental, or consequential damages arising from your use of the service. Our
        total liability for any claim related to the service is limited to the amount you paid us
        in the twelve months before the claim (or zero if the service is free to you).
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access if you violate these terms or if needed to protect the
        service. You may stop using Organizr at any time. Organizers may delete their group subject
        to any outstanding payment or sponsorship obligations.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after changes are posted constitutes acceptance
        of the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Contact{' '}
        <a href="https://aeserna.com" target="_blank" rel="noreferrer">
          Allan at aeserna.com
        </a>
        .
      </p>

      <p>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
