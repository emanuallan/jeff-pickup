import { readFile } from 'fs/promises'
import path from 'path'

let cachedLogoDataUrl: string | null = null

/** Base64 data URL for OG image generation (Satori cannot read local public files). */
export async function getOrganizrLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl
  }

  const file = await readFile(path.join(process.cwd(), 'public/organizr-logo.png'))
  cachedLogoDataUrl = `data:image/png;base64,${file.toString('base64')}`
  return cachedLogoDataUrl
}
