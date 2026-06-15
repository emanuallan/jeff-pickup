import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'

export default function HomePage() {
  const rootDomain = getRootDomain()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">Organizr</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Know who&apos;s coming.
      </h1>
      <p className="mt-4 text-lg text-zinc-400">
        Run recurring group activities — pickup sports, run clubs, meetups — and let
        participants sign up in seconds.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-500"
        >
          Sign in / Create your group
        </Link>
        <Link
          href="/console"
          className="rounded-xl border border-zinc-700 px-5 py-3 text-center text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
        >
          Organizer console
        </Link>
      </div>

      <p className="mt-12 text-sm text-zinc-500">
        Orgs live at <span className="text-zinc-300">yourgroup.{rootDomain}</span>
      </p>
    </main>
  )
}
