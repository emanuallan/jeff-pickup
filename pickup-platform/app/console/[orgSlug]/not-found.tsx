import Link from 'next/link'

export default function ConsoleOrgNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-50">Group not found</h1>
      <p className="mt-2 text-sm text-zinc-400">
        You may not have access, or this group doesn&apos;t exist.
      </p>
      <Link href="/console" className="mt-6 text-sm text-indigo-300 hover:text-indigo-200">
        ← Back to console
      </Link>
    </main>
  )
}
