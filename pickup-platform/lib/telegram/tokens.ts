import { randomBytes } from 'crypto'

const CONNECT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PAIR_TOKEN_BYTES = 24

/** Short human-typeable connect code (e.g. K7M2NPQ4). */
export function generateConnectCode(length = 8): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CONNECT_CODE_ALPHABET[bytes[i]! % CONNECT_CODE_ALPHABET.length]
  }
  return out
}

/** Opaque pair token for deep links. */
export function generatePairToken(): string {
  return randomBytes(PAIR_TOKEN_BYTES).toString('base64url')
}

export const CONNECT_CODE_TTL_MS = 30 * 60 * 1000 // 30 minutes
export const PAIR_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes
