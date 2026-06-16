import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { CreateOrgForm } from '../create-org-form'
import { ConsolePage, ConsoleHeader } from '../_components/console-ui'

export default async function NewOrgPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/console/new')
  }

  const rootDomain = getRootDomain()

  return (
    <ConsolePage width="max-w-lg">
      <ConsoleHeader title="Create your group" backHref="/console" backLabel="Groups" />
      <p className="mt-2 text-sm text-zinc-400">
        You&apos;ll get a page at <span className="text-zinc-300">your-slug.{rootDomain}</span>
      </p>

      <div className="mt-8">
        <CreateOrgForm />
      </div>
    </ConsolePage>
  )
}
