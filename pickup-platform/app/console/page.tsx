import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgs } from '@/lib/orgs'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { orgBaseUrl } from '@/lib/og-metadata'
import { ConsolePage, ConsoleHeader, EmptyState, btnPrimary } from './_components/console-ui'

export default async function ConsolePage_() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/console')
  }

  const orgs = await getUserOrgs()
  const rootDomain = getRootDomain()

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Your groups"
        description={user.email ?? undefined}
        actions={
          orgs.length > 0 ? (
            <Link href="/console/new" className={btnPrimary}>
              + New group
            </Link>
          ) : undefined
        }
      />

      {orgs.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No groups yet"
            description="Create your first group to add locations, schedules, and start tracking who's coming."
          >
            <Link href="/console/new" className={btnPrimary}>
              + Create group
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {orgs.map((org) => {
            const orgPublicUrl = orgBaseUrl(org.slug)

            return (
              <li key={org.id}>
                <div className="group flex h-full flex-col rounded-xl border border-white/10 bg-zinc-900/50 p-4 transition-colors hover:border-indigo-500/40">
                  <div className="flex items-start gap-3">
                    {org.branding.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.branding.logo_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                        style={{ backgroundColor: org.branding.accent_color }}
                      >
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-100">{org.name}</div>
                      {org.activity ? (
                        <div className="truncate text-xs text-zinc-400">{org.activity}</div>
                      ) : null}
                      <div className="mt-0.5 truncate text-xs text-zinc-600">
                        {org.slug}.{rootDomain}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
                    <Link
                      href={`/console/${org.slug}`}
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-500/25 transition hover:bg-indigo-500/25"
                    >
                      Manage
                    </Link>
                    <a
                      href={orgPublicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                    >
                      Public ↗
                    </a>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </ConsolePage>
  )
}
