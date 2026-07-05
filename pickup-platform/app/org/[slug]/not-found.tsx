import { ORG_PUBLIC_CONTENT_MAX } from '@/lib/org-public-layout'

export default function OrgNotFound() {
  return (
    <main
      className={`mx-auto flex min-h-dvh flex-col items-center justify-center px-6 text-center ${ORG_PUBLIC_CONTENT_MAX}`}
    >
      <h1 className="text-2xl font-semibold">Group not found</h1>
      <p className="mt-2 text-sm text-zinc-400">
        This group doesn&apos;t exist or isn&apos;t active yet.
      </p>
    </main>
  )
}
