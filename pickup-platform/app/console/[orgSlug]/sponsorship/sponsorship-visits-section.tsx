import {
  formatSponsorshipConsoleDate,
} from '@/lib/sponsorship'
import type { SponsorLinkClickStat } from '@/lib/sponsor-link-clicks'
import { ConsoleSection, btnOutline } from '../../_components/console-ui'

export function SponsorshipVisitsSection({
  orgSlug,
  stats,
}: {
  orgSlug: string
  stats: SponsorLinkClickStat[]
}) {
  const totalClicks = stats.reduce((sum, row) => sum + row.total_clicks, 0)
  const exportHref = `/api/console/${orgSlug}/sponsorship/clicks`

  return (
    <ConsoleSection
      title="Sponsor visits"
      description="Clicks from your public logo links through to each sponsor’s website."
      action={
        <a href={exportHref} className={btnOutline}>
          Export CSV
        </a>
      }
    >
      {stats.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No sponsors yet. Once logos with website links are live, visits show up here.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            {totalClicks === 0
              ? 'No visits recorded yet.'
              : `${totalClicks} total visit${totalClicks === 1 ? '' : 's'} across ${stats.length} sponsor${stats.length === 1 ? '' : 's'}.`}
          </p>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
            {stats.map((row) => (
              <li
                key={row.sponsorship_id}
                className="flex flex-col gap-1 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{row.sponsor_name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {row.tier_name}
                    {row.sponsor_url ? ` · ${row.sponsor_url}` : ' · no website link'}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-semibold tabular-nums text-zinc-100">
                    {row.total_clicks} visit{row.total_clicks === 1 ? '' : 's'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {row.unique_visitors} unique
                    {row.last_click_at
                      ? ` · last ${formatSponsorshipConsoleDate(row.last_click_at)}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            CSV includes sponsor name, contact email, URL, tier, totals, and first/last visit
            timestamps — handy for reporting back to each partner.
          </p>
        </div>
      )}
    </ConsoleSection>
  )
}
