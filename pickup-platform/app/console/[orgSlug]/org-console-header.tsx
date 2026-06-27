import type { ReactNode } from 'react'

type Props = {
  orgName: string
  orgDescription: string | null
  logoUrl: string | null
  action: ReactNode
}

export function OrgConsoleHeader({
  orgName,
  orgDescription,
  logoUrl,
  action,
}: Props) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{orgName}</h1>
          {orgDescription ? <p className="mt-1 text-sm text-zinc-400">{orgDescription}</p> : null}
        </div>
      </div>

      {action}
    </div>
  )
}
