export const ADDITIONAL_INFORMATION_MAX_LENGTH = 500

export function normalizeAdditionalInformation(raw: unknown): string {
  return String(raw ?? '').trim().slice(0, ADDITIONAL_INFORMATION_MAX_LENGTH)
}
