const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth: 'That sign-in link did not work. It may have expired — request a new magic link.',
}

export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong while signing in. Please try again.'
}
