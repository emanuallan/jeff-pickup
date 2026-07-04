'use client'

import { useId, useState } from 'react'
import { ADDITIONAL_INFORMATION_MAX_LENGTH } from '@/lib/additional-information'
import { chipAction, consoleInput, consoleLabel } from './console-ui'

type Props = {
  defaultValue?: string
}

export function CollapsibleAdditionalInformationField({ defaultValue = '' }: Props) {
  const id = useId()
  const [expanded, setExpanded] = useState(defaultValue.trim().length > 0)
  const [value, setValue] = useState(defaultValue)

  if (!expanded) {
    return (
      <div className="space-y-2">
        {value.trim() ? (
          <>
            <input type="hidden" name="additional_information" value={value} />
            <p className={consoleLabel}>Additional information</p>
            <p className="line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
              {value.trim()}
            </p>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`${chipAction} text-zinc-400 hover:bg-white/5 hover:text-zinc-200`}
        >
          {value.trim() ? 'Edit additional information' : 'Add additional information (optional)'}
        </button>
      </div>
    )
  }

  return (
    <label className="block" htmlFor={id}>
      <span className={consoleLabel}>Additional information (optional)</span>
      <textarea
        id={id}
        name="additional_information"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        maxLength={ADDITIONAL_INFORMATION_MAX_LENGTH}
        placeholder="Shown on the event card — parking tips, what to bring, etc."
        className={`mt-1 ${consoleInput} resize-y`}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-600">
          {value.length}/{ADDITIONAL_INFORMATION_MAX_LENGTH}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className={`${chipAction} text-zinc-500 hover:bg-white/5 hover:text-zinc-300`}
        >
          Minimize
        </button>
      </div>
    </label>
  )
}
