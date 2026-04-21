export function SetupNeededBanner(props: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-1 text-sm text-[--muted]">{props.body}</div>
    </section>
  )
}

