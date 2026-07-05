import type { Participant, MySignup } from '@/lib/participant'

export function signupFirstName(
  participant: Participant | null,
  mySignup: MySignup | null,
): string {
  const first = participant?.first_name?.trim()
  if (first) return first

  const display = mySignup?.display_name ?? participant?.display_name ?? ''
  const token = display.trim().split(/\s+/)[0]
  return token || 'there'
}

export function signupConfirmationCopy({
  firstName,
  isWaitlisted,
  guestCount,
}: {
  firstName: string
  isWaitlisted: boolean
  guestCount: number
}): { title: string; body: string } {
  if (isWaitlisted) {
    return {
      title: `Thanks, ${firstName}!`,
      body:
        guestCount > 0
          ? `You're on the waitlist with ${guestCount} guest${guestCount === 1 ? '' : 's'}. We'll count you in automatically if a spot opens.`
          : "You're on the waitlist. We'll count you in automatically if a spot opens.",
    }
  }

  return {
    title: `Thanks for signing up, ${firstName}!`,
    body:
      guestCount > 0
        ? `You and ${guestCount} guest${guestCount === 1 ? '' : 's'} are on the list — see you there.`
        : "You're on the list — see you there.",
  }
}
