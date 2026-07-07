'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { refreshGroupRules, updateGroupRulesFeature, updateGroupRulesText } from '../actions'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { btnSecondary } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'
import {
  formatGroupRulesEnforcedAt,
  GROUP_RULES_TEXT_MAX_LENGTH,
  type OrgGroupRules,
} from '@/lib/group-rules'
import type { GroupRulesAgreementSummary } from '@/lib/group-rules.server'

type Props = {
  orgSlug: string
  enabled: boolean
  rules: OrgGroupRules | null
  summary: GroupRulesAgreementSummary | null
}

const textareaClass =
  'mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/20'

function GroupRulesEnableToggle({
  orgSlug,
  enabled,
  onEnabledChange,
}: {
  orgSlug: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle(next: boolean) {
    onEnabledChange(next)
    startTransition(async () => {
      const result = await updateGroupRulesFeature(orgSlug, next)
      if (result?.error) {
        onEnabledChange(!next)
        toast.error(result.error)
        return
      }
      toast.success(next ? 'Group rules enabled.' : 'Group rules turned off.')
      router.refresh()
    })
  }

  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 transition ${
        isPending ? 'opacity-70' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">Require acceptance before sign-up</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
          When on, participants see your agreement in a bottom sheet and must accept before joining.
        </span>
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isPending}
          onChange={(event) => handleToggle(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-zinc-700/90 shadow-inner transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  )
}

export function GroupRulesSection({ orgSlug, enabled: initialEnabled, rules, summary }: Props) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [showAgreements, setShowAgreements] = useState(false)

  useEffect(() => {
    setEnabled(initialEnabled)
  }, [initialEnabled])

  async function handleSaveRules(formData: FormData) {
    const result = await updateGroupRulesText(orgSlug, formData)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Group rules saved.')
    router.refresh()
  }

  async function handleRefresh() {
    const confirmed = window.confirm(
      'Everyone will need to accept the current rules again before they can sign up. Continue?',
    )
    if (!confirmed) return

    const result = await refreshGroupRules(orgSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Re-acceptance requested. Participants will be prompted on their next sign-up.')
    router.refresh()
  }

  const version = rules?.version ?? 0
  const hasPublishedRules = version > 0 && !!rules?.text

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40">
      <GroupRulesEnableToggle
        orgSlug={orgSlug}
        enabled={enabled}
        onEnabledChange={setEnabled}
      />

      {enabled ? (
        <div className="space-y-6 border-t border-white/10 px-4 py-4">
          <form action={handleSaveRules} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-100">Agreement text</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                Shown in a bottom sheet when someone signs up. Saving edits updates the text for
                future prompts but does not ask anyone to accept again.
              </span>
              <textarea
                name="rules_text"
                rows={10}
                maxLength={GROUP_RULES_TEXT_MAX_LENGTH}
                defaultValue={rules?.text ?? ''}
                placeholder="Example: Be respectful, show up on time, and communicate if you can’t make it."
                className={textareaClass}
              />
            </label>

            <div className="pt-1">
              <ConsoleSubmitButton className={`w-full sm:w-auto ${btnSecondary}`}>
                Save rules
              </ConsoleSubmitButton>
            </div>
          </form>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3.5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-500">Last enforced</div>
                <div className="mt-1 font-medium text-zinc-100">
                  {formatGroupRulesEnforcedAt(rules?.last_enforced_at)}
                </div>
                {hasPublishedRules ? (
                  <div className="mt-1 text-xs text-zinc-500">Current version: v{version}</div>
                ) : null}
              </div>

              {summary && hasPublishedRules ? (
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Accepted current version</div>
                  <div className="mt-1 font-medium text-zinc-100">
                    {summary.agreedCount} of {summary.totalParticipants}
                  </div>
                </div>
              ) : null}
            </div>

            {hasPublishedRules ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-indigo-500/30 hover:bg-zinc-900"
                  >
                    Request re-acceptance
                  </button>
                  {summary && summary.agreements.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAgreements((open) => !open)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-indigo-500/30 hover:bg-zinc-900"
                    >
                      {showAgreements ? 'Hide acceptances' : 'View who accepted'}
                    </button>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  Participants are prompted on sign-up if they have not accepted the current version.
                  To ask everyone — including people who already agreed — to accept again, use{' '}
                  <span className="text-zinc-400">Request re-acceptance</span>. Saving text alone
                  does not re-prompt anyone.
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Save agreement text above to start requiring acceptance on sign-up.
              </p>
            )}

            {showAgreements && summary ? (
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {summary.agreements.map((row) => (
                  <li
                    key={`${row.phone}:${row.accepted_at}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-zinc-200">{row.display_name}</span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatGroupRulesEnforcedAt(row.accepted_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-zinc-500">
          Turn on the toggle above to add agreement text and gate sign-ups.
        </p>
      )}
    </div>
  )
}
