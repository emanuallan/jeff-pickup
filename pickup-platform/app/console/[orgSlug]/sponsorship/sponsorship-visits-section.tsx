'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatSponsorshipConsoleDate } from '@/lib/sponsorship'
import type {
  SponsorLinkClickArchive,
  SponsorLinkClickStat,
} from '@/lib/sponsor-link-clicks'
import { canArchiveSponsorAnalytics } from '@/lib/sponsor-link-clicks'
import { archiveSponsorshipAnalytics } from '../../sponsorship-actions'
import { ConsoleSection, btnOutline } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import { SponsorVisitorsSheet } from './sponsor-visitors-sheet'

type VisitorsTarget = {
  sponsorshipId: string
  sponsorName: string
  archiveId: string | null
}

export function SponsorshipVisitsSection({
  orgSlug,
  stats,
  archives,
}: {
  orgSlug: string
  stats: SponsorLinkClickStat[]
  archives: SponsorLinkClickArchive[]
}) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [liveStats, setLiveStats] = useState(stats)
  const [archivedRows, setArchivedRows] = useState(archives)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [visitorsTarget, setVisitorsTarget] = useState<VisitorsTarget | null>(null)

  useEffect(() => {
    setLiveStats(stats)
    setArchivedRows(archives)
  }, [stats, archives])

  const totalClicks = liveStats.reduce((sum, row) => sum + row.total_clicks, 0)
  const exportHref = `/api/console/${orgSlug}/sponsorship/clicks`
  const archivedExportHref = `${exportHref}?scope=archived`

  async function handleArchive(sponsorshipId: string, sponsorName: string) {
    if (busyId) return
    const confirmed = window.confirm(
      `Archive current visit totals for ${sponsorName}? Live counts reset to zero; the archived period stays available for CSV reports.`,
    )
    if (!confirmed) return

    setBusyId(sponsorshipId)
    try {
      const result = await archiveSponsorshipAnalytics(orgSlug, sponsorshipId)
      if (result?.error) {
        toast.error(result.error)
        return
      }

      const moved = liveStats.find((row) => row.sponsorship_id === sponsorshipId)
      if (moved && moved.total_clicks > 0) {
        setLiveStats((rows) =>
          rows
            .map((row) =>
              row.sponsorship_id === sponsorshipId
                ? {
                    ...row,
                    total_clicks: 0,
                    unique_visitors: 0,
                    first_click_at: null,
                    last_click_at: null,
                  }
                : row,
            )
            .filter(
              (row) =>
                row.status === 'approved' ||
                row.status === 'hidden' ||
                row.total_clicks > 0,
            ),
        )
        setArchivedRows((rows) => [
          {
            id: `local-${Date.now()}`,
            sponsorship_id: moved.sponsorship_id,
            sponsor_name: moved.sponsor_name,
            contact_email: moved.contact_email,
            sponsor_url: moved.sponsor_url,
            tier_name: moved.tier_name,
            total_clicks: moved.total_clicks,
            unique_visitors: moved.unique_visitors,
            first_click_at: moved.first_click_at,
            last_click_at: moved.last_click_at,
            archived_at: new Date().toISOString(),
          },
          ...rows,
        ])
      }

      toast.success('Visit period archived. Live counter reset.')
      router.refresh()
    } catch {
      toast.error('Could not archive visits. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <ConsoleSection
        title="Sponsor visits"
        description="Clicks from your public logo links through to each sponsor’s website."
        action={
          <a href={exportHref} className={btnOutline}>
            Export CSV
          </a>
        }
      >
        {liveStats.length === 0 && archivedRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No sponsors yet. Once logos with website links are live, visits show up here.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                {totalClicks === 0
                  ? 'No live visits in the current period.'
                  : `${totalClicks} live visit${totalClicks === 1 ? '' : 's'} across ${liveStats.length} sponsor${liveStats.length === 1 ? '' : 's'}.`}
              </p>
              {liveStats.length === 0 ? (
                <p className="text-sm text-zinc-500">No current-period sponsors to show.</p>
              ) : (
                <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
                  {liveStats.map((row) => (
                    <li
                      key={row.sponsorship_id}
                      className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">{row.sponsor_name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {row.tier_name}
                          {row.sponsor_url ? ` · ${row.sponsor_url}` : ' · no website link'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <div className="mr-1 text-left sm:text-right">
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
                        {row.total_clicks > 0 ? (
                          <>
                            <button
                              type="button"
                              className={`${btnOutline} min-h-9 px-3 py-1.5 text-xs`}
                              onClick={() =>
                                setVisitorsTarget({
                                  sponsorshipId: row.sponsorship_id,
                                  sponsorName: row.sponsor_name,
                                  archiveId: null,
                                })
                              }
                            >
                              People
                            </button>
                            {canArchiveSponsorAnalytics(row.status) ? (
                              <button
                                type="button"
                                className={`${btnOutline} min-h-9 px-3 py-1.5 text-xs`}
                                disabled={busyId !== null}
                                onClick={() =>
                                  void handleArchive(row.sponsorship_id, row.sponsor_name)
                                }
                              >
                                {busyId === row.sponsorship_id ? 'Archiving…' : 'Archive'}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] leading-relaxed text-zinc-500">
                People lists known participants (with visit counts) and anonymous guests. Export CSV
                includes period summaries plus those people rows. Archive is available after a
                sponsor is hidden or canceled (not live on public pages).
              </p>
            </div>

            {archivedRows.length > 0 ? (
              <details className="rounded-xl border border-white/10 bg-zinc-950/30 open:bg-zinc-950/40">
                <summary className="cursor-pointer list-none px-3.5 py-3 text-sm font-medium text-zinc-200">
                  Archived ({archivedRows.length})
                </summary>
                <div className="space-y-3 border-t border-white/5 px-3.5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">
                      Closed periods kept for reporting. New clicks count toward the live totals
                      above.
                    </p>
                    <a
                      href={archivedExportHref}
                      className={`${btnOutline} min-h-9 px-3 py-1.5 text-xs`}
                    >
                      Export archived CSV
                    </a>
                  </div>
                  <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
                    {archivedRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">{row.sponsor_name}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {row.tier_name}
                            {' · archived '}
                            {formatSponsorshipConsoleDate(row.archived_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <div className="mr-1 text-left sm:text-right">
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
                          {row.total_clicks > 0 && !row.id.startsWith('local-') ? (
                            <button
                              type="button"
                              className={`${btnOutline} min-h-9 px-3 py-1.5 text-xs`}
                              onClick={() =>
                                setVisitorsTarget({
                                  sponsorshipId: row.sponsorship_id,
                                  sponsorName: row.sponsor_name,
                                  archiveId: row.id,
                                })
                              }
                            >
                              People
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : null}
          </div>
        )}
      </ConsoleSection>

      {visitorsTarget ? (
        <SponsorVisitorsSheet
          orgSlug={orgSlug}
          sponsorshipId={visitorsTarget.sponsorshipId}
          sponsorName={visitorsTarget.sponsorName}
          archiveId={visitorsTarget.archiveId}
          open
          onClose={() => setVisitorsTarget(null)}
        />
      ) : null}
    </>
  )
}
