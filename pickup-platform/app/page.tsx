import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from './_components/organizr-shell'
import { OrganizrLogo } from './_components/organizr-logo'

export default function HomePage() {
  const rootDomain = getRootDomain()

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader />

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col justify-center px-6 py-16">
        <OrganizrLogo
          size={40}
          priority
          className="inline-flex items-center gap-2.5"
          wordmarkClassName="text-sm font-bold tracking-tight text-zinc-50"
        />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-50">
          Know who&apos;s coming.
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Run recurring group activities — pickup sports, run clubs, meetups — and let
          participants sign up in seconds.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={`${organizrBtnPrimary} text-center`}>
            Sign in / Create your group
          </Link>
          <Link href="/console" className={`${organizrBtnSecondary} text-center`}>
            Organizer console
          </Link>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          Orgs live at <span className="text-zinc-300">yourgroup.{rootDomain}</span>
        </p>
      </main>
    </div>
  )
}
