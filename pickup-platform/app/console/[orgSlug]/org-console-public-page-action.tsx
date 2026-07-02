import { arrowNe } from '@/lib/text-arrows'
import { btnAccent } from '../_components/console-ui'
import { isOrgConsoleHubSetupComplete } from './org-console-nav'

export function OrgConsolePublicPageActionFallback() {
  return (
    <span
      className={`${btnAccent} pointer-events-none w-full shrink-0 opacity-40 sm:w-auto`}
      aria-hidden
    >
      View public page {arrowNe}
    </span>
  )
}

export async function OrgConsolePublicPageAction({
  orgId,
  publicUrl,
}: {
  orgId: string
  publicUrl: string
}) {
  const isSetup = await isOrgConsoleHubSetupComplete(orgId)
  const label = (
    <>
      View public page {arrowNe}
    </>
  )

  if (!isSetup) {
    return (
      <span
        className={`${btnAccent} pointer-events-none w-full shrink-0 opacity-50 sm:w-auto`}
        aria-disabled="true"
      >
        {label}
      </span>
    )
  }

  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noreferrer"
      className={`${btnAccent} w-full shrink-0 sm:w-auto`}
    >
      {label}
    </a>
  )
}
