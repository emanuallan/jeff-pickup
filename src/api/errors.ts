export type AppErrorCode =
  | 'SUPABASE_NOT_CONFIGURED'
  | 'CONSTRAINT_UNIQUE'
  | 'UNKNOWN'

export type AppError = {
  code: AppErrorCode
  message: string
  cause?: unknown
}

export function toAppError(err: unknown): AppError {
  const msg =
    typeof err === 'object' && err && 'message' in err
      ? String((err as any).message)
      : ''

  if (msg.includes('Supabase is not configured')) {
    return { code: 'SUPABASE_NOT_CONFIGURED', message: msg || 'Supabase not configured.', cause: err }
  }

  // Postgres unique violation often surfaces as 23505 in message from Supabase.
  if (msg.includes('23505')) {
    return { code: 'CONSTRAINT_UNIQUE', message: msg || 'Already exists.', cause: err }
  }

  return { code: 'UNKNOWN', message: msg || 'Unknown error.', cause: err }
}

