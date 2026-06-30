import type { Org } from '@/lib/orgs'
import { Suspense } from 'react'
import { OrgHeader } from './org-header'
import { OrgPageShell, OrgPageFooter } from './org-page-shell'
import { OrgPublicNavDeferred } from './org-public-nav-deferred'
import { OrgPublicNavFallback } from './org-public-nav'
import type { OrgPublicNavKey } from '@/lib/org-public-nav'

type Props = {
  org: Org
  title: string
  activeKey: OrgPublicNavKey
  description: string
}

export function OrgPlaceholderPage({ org, title, activeKey, description }: Props) {
  return (
    <OrgPageShell>
      <OrgHeader org={org} title={title} subtitle={org.name} className="mt-2" />

      <Suspense fallback={<OrgPublicNavFallback />}>
        <OrgPublicNavDeferred org={org} activeKey={activeKey} />
      </Suspense>

      <section className="mt-10 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
        <p className="text-sm font-medium text-zinc-300">{title}</p>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
        <p className="mt-4 text-xs text-zinc-600">Preview placeholder — not live yet.</p>
      </section>

      <OrgPageFooter slug={org.slug} links={org.branding.links} />
    </OrgPageShell>
  )
}
