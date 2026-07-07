'use client'

import { useState } from 'react'
import { refreshGroupRules, updateGroupRulesText } from '../actions'
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

export function GroupRulesSection({ orgSlug, enabled, rules, summary }: Props) {
  const toast = useConsoleToast()
  const [showAgreements, setShowAgreements] = useState(false)

  async function handleSaveRules(formData: FormData) {
    const result = await updateGroupRulesText(orgSlug, formData)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Group rules saved.')
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
  }

  const version = rules?.version ?? 0
  const hasPublishedRules = version > 0 && !!rules?.text

  return (
    <div className="space-y-6">
      {!enabled ? (
        <p className="text-sm text-zinc-500">
          Turn on the Group rules feature above to require acceptance before sign-up.
        </p>
      ) : null}

      <form action={handleSaveRules} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-100">Agreement text</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
            Shown in a bottom sheet when someone signs up. You can edit the text anytime — use
            Request re-acceptance below only when you want everyone to agree again.
          </span>
          <textarea
            name="rules_text"
            rows={10}
            maxLength={GROUP_RULES_TEXT_MAX_LENGTH}
            defaultValue={rules?.text ?? ''}
            disabled={!enabled}
            placeholder="Example: Be respectful, show up on time, and communicate if you can’t make it."
            className={`${textareaClass} disabled:cursor-not-allowed disabled:opacity-50`}
          />
        </label>

        <div className="pt-1">
          <ConsoleSubmitButton
            disabled={!enabled}
            className={`w-full sm:w-auto ${btnSecondary}`}
          >
            Save rules
          </ConsoleSubmitButton>
        </div>
      </form>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-sm">
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

        {enabled && hasPublishedRules ? (
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
        ) : null}

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
  )
}
