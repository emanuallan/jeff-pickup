import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgs } from '@/lib/orgs'
import { getRootDomain } from '@/lib/tenancy/parse-host'

export default async function ConsolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/console')
  }

  const orgs = await getUserOrgs()
  const rootDomain = getRootDomain()

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizer console</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-200">
            Sign out
          </button>
        </form>
      </div>

      <p className="mt-2 text-sm text-zinc-400">Signed in as {user.email}</p>

      <Link
        href="/console/new"
        className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
      >
        + Create group
      </Link>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Your groups
        </h2>

        {orgs.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No groups yet. Create one to add locations, schedules, and sessions.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orgs.map((org) => {
              const orgPublicUrl =
                process.env.NODE_ENV === 'development'
                  ? `http://${org.slug}.localhost:3000`
                  : `https://${org.slug}.${rootDomain}`

              return (
                <li key={org.id}>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-zinc-500">
                          {org.slug}.{rootDomain}
                        </div>
                      </div>
                      <a
                        href={orgPublicUrl}
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Public →
                      </a>
                    </div>
                    <Link
                      href={`/console/${org.slug}`}
                      className="mt-3 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      Manage →
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Link href="/" className="mt-10 inline-block text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to home
      </Link>
    </main>
  )
}
