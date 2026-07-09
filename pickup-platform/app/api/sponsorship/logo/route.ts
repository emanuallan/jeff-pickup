import { NextResponse } from 'next/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildSponsorLogoPath,
  extensionForMime,
  publicLogoUrl,
  validateLogoFileContent,
} from '@/lib/sponsor-logo'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const formData = await request.formData()
  const slug = String(formData.get('slug') ?? '').trim()
  const file = formData.get('logo')

  if (!slug) {
    return NextResponse.json({ error: 'Missing group.' }, { status: 400 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a logo image to upload.' }, { status: 400 })
  }

  const validation = await validateLogoFileContent(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const uploadId = randomUUID()
  const ext = extensionForMime(validation.mime)
  const storagePath = buildSponsorLogoPath(org.id, uploadId, ext)
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('organizr_public')
    .upload(storagePath, file, { contentType: validation.mime })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const logoUrl = publicLogoUrl(storagePath)

  return NextResponse.json({
    ok: true,
    logo_url: logoUrl,
    upload_id: uploadId,
  })
}
