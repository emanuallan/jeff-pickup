export default function Loading() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="mx-auto h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-12 animate-pulse rounded-xl border border-white/10 bg-zinc-900/50" />
        <div className="h-12 animate-pulse rounded-xl border border-white/10 bg-zinc-900/50" />
        <div className="h-11 animate-pulse rounded-lg bg-indigo-600/40" />
      </div>
    </main>
  )
}
