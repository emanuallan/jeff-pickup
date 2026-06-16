import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgs } from '@/lib/orgs'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { orgBaseUrl } from '@/lib/og-metadata'

export default async function ConsolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/console')
  }

  const orgs = await getUserOrgs()
  const rootDomain = getRootDomain()

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your groups</h1>
          <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      {orgs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No groups yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-500">
            Create your first group to add locations, schedules, and start tracking who&apos;s
            coming.
          </p>
          <Link
            href="/console/new"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            + Create group
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {orgs.length} {orgs.length === 1 ? 'group' : 'groups'}
            </p>
            <Link
              href="/console/new"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + Create group
            </Link>
          </div>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {orgs.map((org) => {
              const orgPublicUrl = orgBaseUrl(org.slug)

              return (
                <li key={org.id}>
                  <div className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
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
                        <div className="truncate font-medium">{org.name}</div>
                        {org.activity ? (
                          <div className="truncate text-xs text-zinc-400">{org.activity}</div>
                        ) : null}
                        <div className="mt-0.5 truncate text-xs text-zinc-600">
                          {org.slug}.{rootDomain}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3">
                      <Link
                        href={`/console/${org.slug}`}
                        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                      >
                        Manage
                      </Link>
                      <a
                        href={orgPublicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        Public ↗
                      </a>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}
