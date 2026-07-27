import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getMyParticipantOrgs } from '@/lib/participant-account'
import { createClient } from '@/lib/supabase/server'
import { formatPriceCents } from '@/lib/session-payment'
import { orgBaseUrl } from '@/lib/site-url'
import { ROBOTS_PRIVATE } from '@/lib/seo'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from '@/app/_components/organizr-shell'
import { OrganizrLogo } from '@/app/_components/organizr-logo'

export const metadata: Metadata = {
  title: 'My groups',
  robots: ROBOTS_PRIVATE,
}

type PaymentRow = {
  id: string
  amount_cents: number
  currency: string
  status: string
  completed_at: string | null
  created_at: string
  events: { title: string | null; short_id: string } | null
  orgs: { name: string; slug: string } | null
}

export default async function MePage() {
  const user = await getAuthUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/me')}`)
  }

  const [orgs, payments] = await Promise.all([
    getMyParticipantOrgs(),
    loadPaymentHistory(),
  ])

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader showSignIn={false} />

      <main className="mx-auto max-w-2xl px-6 py-10 sm:px-8 sm:py-14">
        <OrganizrLogo
          size={36}
          wordmarkClassName="text-base font-bold tracking-tight text-zinc-50"
        />

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-50">My groups</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Groups linked to {user.email ?? 'your account'}. Soft phone join still works for free
          sessions; this account is for paid sessions and cross-group history.
        </p>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Groups</h2>
          {orgs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No linked groups yet. Join a session and use &ldquo;Save your account&rdquo;, or pay
              for a paid session.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-900/40">
              {orgs.map((org) => (
                <li key={org.org_id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">{org.org_name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {org.display_name} · {org.org_slug}
                    </p>
                  </div>
                  <a
                    href={orgBaseUrl(org.org_slug)}
                    className={`${organizrBtnSecondary} shrink-0 px-3 py-2 text-xs`}
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Payment history
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">No session payments yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-900/40">
              {payments.map((payment) => {
                const orgSlug = payment.orgs?.slug
                const eventShortId = payment.events?.short_id
                const when = payment.completed_at ?? payment.created_at
                const href =
                  orgSlug && eventShortId
                    ? `${orgBaseUrl(orgSlug)}/?cal=${encodeURIComponent(eventShortId)}`
                    : orgSlug
                      ? orgBaseUrl(orgSlug)
                      : null
                const row = (
                  <>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">
                        {payment.events?.title?.trim() || 'Session'}
                        {payment.orgs?.name ? (
                          <span className="font-normal text-zinc-500">
                            {' '}
                            · {payment.orgs.name}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatPriceCents(payment.amount_cents, payment.currency)} ·{' '}
                        {payment.status}
                        {when
                          ? ` · ${new Date(when).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}`
                          : ''}
                      </p>
                    </div>
                  </>
                )
                return (
                  <li key={payment.id}>
                    {href ? (
                      <a
                        href={href}
                        className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-white/[0.03]"
                      >
                        {row}
                      </a>
                    ) : (
                      <div className="px-4 py-3.5">{row}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/console" className={organizrBtnPrimary}>
            Organizer console
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className={organizrBtnSecondary}>
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

async function loadPaymentHistory(): Promise<PaymentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_payments')
    .select(
      `
      id,
      amount_cents,
      currency,
      status,
      completed_at,
      created_at,
      events ( title, short_id ),
      orgs ( name, slug )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(25)

  if (error || !data) return []

  return data.map((row) => {
    const events = Array.isArray(row.events) ? row.events[0] : row.events
    const orgs = Array.isArray(row.orgs) ? row.orgs[0] : row.orgs
    return {
      id: String(row.id),
      amount_cents: Number(row.amount_cents),
      currency: String(row.currency ?? 'usd'),
      status: String(row.status),
      completed_at: row.completed_at ? String(row.completed_at) : null,
      created_at: String(row.created_at),
      events: events
        ? {
            title: events.title != null ? String(events.title) : null,
            short_id: String(events.short_id),
          }
        : null,
      orgs: orgs
        ? {
            name: String(orgs.name),
            slug: String(orgs.slug),
          }
        : null,
    }
  })
}
