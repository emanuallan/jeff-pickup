import Link from 'next/link'

export default function ConsoleOrgNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Group not found</h1>
      <p className="mt-2 text-sm text-zinc-400">
        You may not have access, or this group doesn&apos;t exist.
      </p>
      <Link href="/console" className="mt-6 text-sm text-blue-400 hover:text-blue-300">
        ← Back to console
      </Link>
    </main>
  )
}
