'use client'

import { useState } from 'react'
import { updateSponsorshipIntro } from '../../sponsorship-actions'
import { ConsoleSubmitButton } from '../../_components/console-submit-button'
import { consoleInput, consoleLabel } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import { SPONSORSHIP_INTRO_MAX_LENGTH } from '@/lib/sponsorship'

export function SponsorshipIntroForm({
  orgSlug,
  introText,
}: {
  orgSlug: string
  introText: string
}) {
  const toast = useConsoleToast()
  const [draft, setDraft] = useState(introText)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await updateSponsorshipIntro(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Sponsorship page updated.')
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className={consoleLabel} htmlFor="introText">
          Sponsorship page text
        </label>
        <textarea
          id="introText"
          name="introText"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={8}
          maxLength={SPONSORSHIP_INTRO_MAX_LENGTH}
          className={`${consoleInput} mt-2 resize-y`}
          placeholder="Tell visitors why sponsoring your group matters..."
        />
      </div>
      <ConsoleSubmitButton pending={pending} pendingLabel="Saving…">
        Save page text
      </ConsoleSubmitButton>
    </form>
  )
}
