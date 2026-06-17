import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Organizr started with a pickup soccer group in Jeffersonville, Indiana that wanted a simple way to manage attendance.',
}

export default function AboutPage() {
  return (
    <MarketingPage title="About Organizr">
      <p>
        Organizr began the way a lot of good tools do — with a small group of people who just
        wanted to spend less time coordinating and more time actually playing together.
      </p>
      <p>
        In Jeffersonville, Indiana, a pickup soccer group kept running into the same problem every
        week: who&apos;s in? Who&apos;s running late? Do we have enough for a game? Spreadsheets,
        group texts, and last-minute headcounts weren&apos;t cutting it. They wanted something
        simple — a link they could share, a quick way to say &ldquo;I&apos;m in,&rdquo; and a
        live roster everyone could trust.
      </p>
      <p>
        That&apos;s how Organizr was born: a lightweight way to manage recurring sessions and
        see who&apos;s coming, built first for friends on the field and then shaped into something
        any group can use — run clubs, meetups, pickup sports, and whatever else brings people
        together on a regular schedule.
      </p>
      <p>
        The goal hasn&apos;t changed: make showing up easy, make headcount clear, and keep the
        focus on the community — not the logistics.
      </p>
      <p>
        Questions, feedback, or ideas? Reach out to{' '}
        <a href="https://aeserna.com" target="_blank" rel="noreferrer">
          Allan
        </a>{' '}
        at{' '}
        <a href="https://aeserna.com" target="_blank" rel="noreferrer">
          aeserna.com
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
