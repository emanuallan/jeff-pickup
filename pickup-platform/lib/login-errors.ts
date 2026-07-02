const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth: 'Sign-in failed. Request a new link and try again.',
}

/** Map Supabase auth errors to user-facing login copy. */
export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong while signing in. Please try again.'
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('rate') || lower.includes('once every')) {
    return 'Please wait a moment before requesting another link.'
  }

  return message
}
