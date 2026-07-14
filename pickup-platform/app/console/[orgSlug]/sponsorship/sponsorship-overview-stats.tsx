import { buildSponsorshipOverviewStats, formatTierPrice } from '@/lib/sponsorship'
import type { SponsorshipRow } from '@/lib/sponsorship.server'

export function SponsorshipOverviewStats({ rows }: { rows: SponsorshipRow[] }) {
  const stats = buildSponsorshipOverviewStats(rows)
  const visibleSponsors = stats.activeCount + stats.hiddenCount

  const items = [
    {
      label: 'Pending',
      value: String(stats.pendingCount),
      hint: 'Awaiting your review',
    },
    {
      label: 'Active',
      value: String(visibleSponsors),
      hint:
        stats.hiddenCount > 0
          ? `${stats.activeCount} live · ${stats.hiddenCount} hidden`
          : 'On your public pages',
    },
    {
      label: 'Monthly',
      value: formatTierPrice(stats.monthlyRecurringCents),
      hint: 'From active sponsors',
    },
    {
      label: 'History',
      value: String(stats.historyCount),
      hint: 'Ended or declined',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-3"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-50">{item.value}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}
