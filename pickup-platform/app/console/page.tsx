import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getUserOrgs } from '@/lib/orgs'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { orgEventsUrl } from '@/lib/og-metadata'
import { ConsolePage, ConsoleHeader, EmptyState, btnAccent, btnPrimary } from './_components/console-ui'
import { arrowNe } from '@/lib/text-arrows'

export default async function ConsolePage_() {
  const user = await getAuthUser()

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
        <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          {orgs.map((org) => {
            const orgPublicUrl = orgEventsUrl(org.slug)

            return (
              <li key={org.id} className="min-w-0">
                <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 p-4 transition-colors hover:border-indigo-500/40">
                  <div className="flex min-w-0 items-start gap-3">
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
                      {org.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                          {org.description}
                        </p>
                      ) : null}
                      <p className="mt-1 break-all text-xs text-zinc-600">
                        {org.slug}.{rootDomain}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-stretch">
                    <Link
                      href={`/console/${org.slug}`}
                      className={`${btnAccent} w-full sm:flex-1`}
                    >
                      Manage
                    </Link>
                    <a
                      href={orgPublicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 sm:w-auto sm:shrink-0 sm:px-4"
                    >
                      Public page {arrowNe}
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
