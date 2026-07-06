import { clampConsoleGuestCount } from '@/lib/console/guest-count'
import { isValidPhoneDigits, normalizePhoneDigits } from '@/lib/phone'

export type RosterListStatusChoice = 'auto' | 'confirmed' | 'waitlisted'

export type ParsedRosterAddForm = {
  phone: string
  firstName: string
  lastName: string
  displayName: string | null
  guestCount: number
  listStatus: 'confirmed' | 'waitlisted' | null
}

export function parseRosterListStatusChoice(value: string): RosterListStatusChoice {
  if (value === 'confirmed' || value === 'waitlisted') {
    return value
  }
  return 'auto'
}

export function rosterListStatusForRpc(
  choice: RosterListStatusChoice,
): 'confirmed' | 'waitlisted' | null {
  return choice === 'auto' ? null : choice
}

export function parseRosterAddForm(
  formData: FormData,
  guestsEnabled: boolean,
): { data: ParsedRosterAddForm } | { error: string } {
  const phone = normalizePhoneDigits(String(formData.get('phone') ?? ''))
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const displayName = String(formData.get('display_name') ?? '').trim()
  const guestCount = Number.parseInt(String(formData.get('guest_count') ?? '0'), 10)
  const listStatusChoice = parseRosterListStatusChoice(String(formData.get('list_status') ?? 'auto'))

  if (!firstName || !lastName) {
    return { error: 'First and last name are required.' }
  }

  if (!isValidPhoneDigits(phone)) {
    return { error: 'Enter a valid 10-digit phone number.' }
  }

  return {
    data: {
      phone,
      firstName,
      lastName,
      displayName: displayName || null,
      guestCount: guestsEnabled ? clampConsoleGuestCount(guestCount) : 0,
      listStatus: rosterListStatusForRpc(listStatusChoice),
    },
  }
}
