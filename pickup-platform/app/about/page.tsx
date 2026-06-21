import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from '../_components/organizr-shell'
import { MarketingFooter } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/about',
  'About',
  'Organizr started with a pickup soccer group in Jeffersonville, Indiana that wanted a simple way to manage attendance for recurring group activities.',
)

const painPoints = [
  { label: "Who's in?", detail: 'No more guessing from group texts' },
  { label: 'Running late?', detail: 'Hard to signal without spamming the chat' },
  { label: 'Enough for a game?', detail: 'Headcount unclear until the last minute' },
]

const groupTypes = ['Pickup sports', 'Run clubs', 'Meetups', 'Recurring hangouts']

const missionPoints = [
  'Make showing up easy',
  'Make headcount clear',
  'Keep the focus on community — not logistics',
]

function StoryCard({
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

export default function AboutPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            About Organizr
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Organizr began the way a lot of good tools do — with a small group of people who just
            wanted to spend less time coordinating and more time actually playing together.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Jeffersonville, IN', 'Pickup soccer', 'Community first'].map((pill) => (
              <li
                key={pill}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300"
              >
                {pill}
              </li>
            ))}
          </ul>
        </div>

        <StoryCard eyebrow="Origin" title="The weekly headcount problem" className="mt-10">
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            In Jeffersonville, Indiana, a pickup soccer group kept running into the same problem
            every week: who&apos;s in? Who&apos;s running late? Do we have enough for a game?
            Spreadsheets, group texts, and last-minute headcounts weren&apos;t cutting it. They
            wanted something simple — a link they could share, a quick way to say &ldquo;I&apos;m
            in,&rdquo; and a live roster everyone could trust.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {painPoints.map(({ label, detail }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3"
              >
                <div className="text-sm font-semibold text-zinc-100">{label}</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{detail}</p>
              </div>
            ))}
          </div>
        </StoryCard>

        <StoryCard eyebrow="Growth" title="From friends on the field to any group" className="mt-4">
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            That&apos;s how Organizr was born: a lightweight way to manage recurring sessions and
            see who&apos;s coming, built first for friends on the field and then shaped into
            something any group can use — run clubs, meetups, pickup sports, and whatever else
            brings people together on a regular schedule.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {groupTypes.map((type) => (
              <li
                key={type}
                className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-xs font-medium text-indigo-200"
              >
                {type}
              </li>
            ))}
          </ul>
        </StoryCard>

        <StoryCard eyebrow="Mission" title="What we still optimize for" className="mt-4">
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            The goal hasn&apos;t changed:
          </p>
          <ul className="mt-4 space-y-2.5">
            {missionPoints.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm text-zinc-300">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-indigo-400" aria-hidden>
                  ✓
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </StoryCard>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900/80 to-zinc-950/40 p-5 text-center sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
            Say hello
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Questions, feedback, or ideas? Reach out to Allan — we&apos;d love to hear from you.
          </p>
          <a
            href="https://aeserna.com"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
          >
            aeserna.com
          </a>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/features" className={`${organizrBtnPrimary} flex-1 text-center`}>
            See features
          </Link>
          <Link href="/login" className={`${organizrBtnSecondary} flex-1 text-center`}>
            Create your group
          </Link>
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
