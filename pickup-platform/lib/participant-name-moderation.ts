import { Filter } from 'bad-words'

export const DEMO_ORG_SLUG = 'demo'

export const DEMO_NAME_MODERATION_ERROR =
  'Please use an appropriate name on the demo — offensive language is not allowed.'

const profanityFilter = new Filter()

/** Fold leetspeak and strip non-letters for secondary checks. */
function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[^a-z\s]/g, '')
}

function fieldIsProfane(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (profanityFilter.isProfane(trimmed)) return true

  const normalized = normalizeForModeration(trimmed)
  if (normalized && profanityFilter.isProfane(normalized)) return true

  const squeezed = normalized.replace(/\s+/g, '')
  if (squeezed.length >= 3 && profanityFilter.isProfane(squeezed)) return true

  return false
}

export function isDemoOrgSlug(orgSlug: string): boolean {
  return orgSlug === DEMO_ORG_SLUG
}

/** Returns an error message when demo sign-up names are not acceptable. */
export function validateDemoParticipantNames(
  orgSlug: string,
  names: {
    firstName: string
    lastName: string
    displayName?: string | null
  },
): string | null {
  if (!isDemoOrgSlug(orgSlug)) return null

  const firstName = names.firstName.trim()
  const lastName = names.lastName.trim()
  const displayName = names.displayName?.trim() ?? ''
  const resolvedDisplay =
    displayName || `${firstName} ${lastName.charAt(0) ? `${lastName.charAt(0)}.` : ''}`.trim()

  const fields = [firstName, lastName, displayName, resolvedDisplay, `${firstName} ${lastName}`]

  for (const field of fields) {
    if (fieldIsProfane(field)) {
      return DEMO_NAME_MODERATION_ERROR
    }
  }

  return null
}
