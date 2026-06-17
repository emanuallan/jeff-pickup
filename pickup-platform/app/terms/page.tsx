import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for using Organizr.',
}

export default function TermsPage() {
  return (
    <MarketingPage title="Terms of Service">
      <p className="text-sm text-zinc-500">Last updated: June 17, 2026</p>

      <p>
        By using Organizr at organizr.co and related subdomains, you agree to these terms. If you
        do not agree, please do not use the service.
      </p>

      <h2>The service</h2>
      <p>
        Organizr helps groups schedule recurring sessions and track who is attending. We provide
        the platform; organizers are responsible for their groups, sessions, and how they use
        participant information.
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
      </ul>

      <h2>Organizer responsibilities</h2>
      <p>
        If you run a group on Organizr, you are responsible for informing your participants how you
        use their information, responding to their questions, and using contact details only for
        legitimate group-related purposes.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Organizr is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
        guarantee uninterrupted or error-free service. Session details, headcounts, and schedules
        are managed by organizers and participants — we are not responsible for cancellations,
        no-shows, or disputes within a group.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Organizr and its operators will not be liable for
        indirect, incidental, or consequential damages arising from your use of the service. Our
        total liability for any claim related to the service is limited to the amount you paid us
        in the twelve months before the claim (or zero if the service is free).
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access if you violate these terms or if needed to protect the
        service. You may stop using Organizr at any time.
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
