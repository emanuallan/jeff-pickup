import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { CreateOrgForm } from '../create-org-form'

export default async function NewOrgPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/console/new')
  }

  const rootDomain = getRootDomain()

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href="/console" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Console
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Create your group</h1>
      <p className="mt-2 text-sm text-zinc-400">
        You&apos;ll get a page at <span className="text-zinc-300">your-slug.{rootDomain}</span>
      </p>

      <div className="mt-8">
        <CreateOrgForm />
      </div>
    </main>
  )
}
