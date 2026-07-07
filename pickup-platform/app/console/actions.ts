'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { materializeEvents } from '@/lib/materializer'
import {
  getScheduleDeleteImpact,
  isStructuralScheduleChange,
  type Schedule,
} from '@/lib/schedules'
import { geocodeAddress } from '@/lib/geocode'
import { type EventStatus, initialEventStatus, getEventByRef, isEventEnded } from '@/lib/events'
import { getOrgForMember } from '@/lib/orgs'
import { isValidSlug, normalizeSlug } from '@/lib/tenancy/reserved-slugs'
import { MAX_ORG_LINKS, normalizeLinkUrl } from '@/lib/social-links'
import { orgSettings, orgWaitlistSettings, type OrgFeatures, type OrgWaitlistSettings } from '@/lib/org-features'
import {
  buildNextGroupRulesOnSave,
  orgGroupRules,
  validateGroupRulesText,
} from '@/lib/group-rules'
import { isInteriorOperator } from '@/lib/interior'
import {
  ORG_LOGO_BUCKET,
  buildOrgLogoPath,
  deleteOrgLogoStorage,
  extensionForMime,
  parseOurBucketLogoPath,
  publicLogoUrl,
  validateLogoFile,
  validateLogoFileContent,
} from '@/lib/org-logo'
import { parseSessionFormData } from '@/lib/console/parse-session-form'
import { parseScheduleFormData } from '@/lib/console/parse-schedule-form'
import { parseLocationFormData } from '@/lib/console/parse-location-form'
import { assertLocationInOrg } from '@/lib/console/location-ownership'

async function requireOrgAdmin(slug: string) {
  const org = await getOrgForMember(slug)
  if (!org) {
    throw new Error('Not authorized')
  }
  return org
}

export async function createOrg(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/console/new')
  }

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const slug = normalizeSlug(String(formData.get('slug') ?? ''))
  const defaultLocale = String(formData.get('default_locale') ?? 'en')

  if (!name || !slug) {
    return { error: 'Name and slug are required.' }
  }
  if (!isValidSlug(slug)) {
    return { error: 'Slug must be 3–32 characters, lowercase letters, numbers, and hyphens only.' }
  }

  const { error } = await supabase.from('orgs').insert({
    slug,
    name,
    description,
    default_locale: defaultLocale === 'es' ? 'es' : 'en',
    created_by: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'That slug is already taken.' }
    }
    return { error: error.message }
  }

  revalidatePath('/console')
  redirect(`/console/${slug}/setup`)
}

export async function createLocation(
  orgSlug: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const parsed = parseLocationFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const { label, isOnline, address, mapsUrl, meetingUrl } = parsed.values

  // Online locations carry a meeting link instead of a physical address; skip
  // geocoding (no map/weather for online sessions).
  const geo = !isOnline && address ? await geocodeAddress(address) : null

  const { error } = await supabase.from('locations').insert({
    org_id: org.id,
    label,
    is_online: isOnline,
    meeting_url: isOnline ? meetingUrl : '',
    address: isOnline ? '' : address,
    maps_url: isOnline ? '' : mapsUrl,
    lat: geo?.lat ?? 0,
    lon: geo?.lon ?? 0,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  return { ok: true }
}

export async function updateLocation(
  orgSlug: string,
  locationId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const parsed = parseLocationFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const { label, isOnline, address, mapsUrl, meetingUrl } = parsed.values

  const { data: existing, error: fetchError } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }
  if (!existing) {
    return { error: 'Location not found.' }
  }

  const geo = !isOnline && address ? await geocodeAddress(address) : null

  const { error } = await supabase
    .from('locations')
    .update({
      label,
      is_online: isOnline,
      meeting_url: isOnline ? meetingUrl : '',
      address: isOnline ? '' : address,
      maps_url: isOnline ? '' : mapsUrl,
      lat: isOnline ? 0 : (geo?.lat ?? 0),
      lon: isOnline ? 0 : (geo?.lon ?? 0),
    })
    .eq('id', locationId)
    .eq('org_id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/locations`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function deleteLocation(
  orgSlug: string,
  locationId: string,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  // location_id has on-delete-restrict FKs from schedules and events,
  // so check for dependents and explain rather than fail with a raw FK error.
  const [{ count: scheduleCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('location_id', locationId),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('location_id', locationId),
  ])

  if ((scheduleCount ?? 0) > 0) {
    return { error: 'Remove the recurring schedule that uses this location first.' }
  }
  if ((eventCount ?? 0) > 0) {
    return { error: 'This location is used by existing sessions. Remove those first.' }
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)
    .eq('org_id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  return { ok: true }
}

export async function createSchedule(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const parsed = parseScheduleFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }
  const {
    locationId,
    title,
    startTime,
    timezone,
    capacity,
    minPlayers,
    durationMin,
    intervalWeeks,
    byweekday,
    additionalInformation,
  } = parsed.values

  const locationCheck = await assertLocationInOrg(supabase, org.id, locationId)
  if ('error' in locationCheck) {
    return { error: locationCheck.error }
  }

  const anchorDate = new Date().toLocaleDateString('en-CA', { timeZone: timezone || 'UTC' })

  const { error } = await supabase.from('schedules').insert({
    org_id: org.id,
    location_id: locationId,
    title,
    byweekday,
    start_time: startTime,
    timezone,
    capacity,
    min_players: minPlayers,
    duration_min: durationMin,
    interval_weeks: intervalWeeks,
    anchor_date: anchorDate,
    additional_information: additionalInformation,
  })

  if (error) {
    return { error: error.message }
  }

  // Populate sessions immediately so the organizer never has to "generate" by
  // hand; the nightly cron keeps the rolling 5-session buffer topped up afterward.
  // A materialize failure must not fail schedule creation — sessions will still
  // be filled in on the next cron run.
  try {
    await materializeEvents({ orgId: org.id })
  } catch {
    // swallow — schedule was created successfully
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/setup`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function createOneOffEvent(
  orgSlug: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const parsed = parseSessionFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }
  const { title, locationId, startsAtIso, timezone, durationMin, capacity, minPlayers, additionalInformation } =
    parsed.values

  const locationCheck = await assertLocationInOrg(supabase, org.id, locationId)
  if ('error' in locationCheck) {
    return { error: locationCheck.error }
  }

  const { error } = await supabase.from('events').insert({
    org_id: org.id,
    schedule_id: null,
    location_id: locationId,
    title,
    duration_min: durationMin,
    starts_at: startsAtIso,
    timezone,
    capacity,
    min_players: minPlayers,
    additional_information: additionalInformation,
    status: initialEventStatus(minPlayers),
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/setup`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function updateEvent(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    return { error: 'Session not found.' }
  }
  if (isEventEnded(event)) {
    return { error: 'Past sessions cannot be edited.' }
  }

  const parsed = parseSessionFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }
  const { title, locationId, startsAtIso, timezone, durationMin, capacity, minPlayers, additionalInformation } =
    parsed.values

  const locationCheck = await assertLocationInOrg(supabase, org.id, locationId)
  if ('error' in locationCheck) {
    return { error: locationCheck.error }
  }

  if (event.schedule_id && event.starts_at !== startsAtIso) {
    const { error: skipError } = await supabase.from('schedule_event_skips').upsert(
      {
        org_id: org.id,
        schedule_id: event.schedule_id,
        starts_at: event.starts_at,
      },
      { onConflict: 'schedule_id,starts_at', ignoreDuplicates: true },
    )

    if (skipError) {
      return { error: skipError.message }
    }
  }

  const { error } = await supabase
    .from('events')
    .update({
      title,
      location_id: locationId,
      starts_at: startsAtIso,
      timezone,
      duration_min: durationMin,
      capacity,
      min_players: minPlayers,
      additional_information: additionalInformation,
    })
    .eq('id', event.id)
    .eq('org_id', org.id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Another session from this schedule already exists at that time.' }
    }
    return { error: error.message }
  }

  await supabase.rpc('maybe_promote_event', { p_event_id: event.id })

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/sessions`)
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/sessions/${eventId}`)
  return { ok: true }
}

export async function cancelEvent(orgSlug: string, eventId: string): Promise<void> {
  await updateEventStatus(orgSlug, eventId, 'cancelled')
}

export async function uncancelEvent(orgSlug: string, eventId: string): Promise<void> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('min_players')
    .eq('short_id', eventId)
    .eq('org_id', org.id)
    .maybeSingle()

  await updateEventStatus(orgSlug, eventId, initialEventStatus(event?.min_players))
}

export async function updateEventStatus(
  orgSlug: string,
  eventId: string,
  status: EventStatus,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, status')
    .eq('short_id', eventId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError || !event) {
    return { error: 'Session not found.' }
  }

  if (event.status === status) {
    return { ok: true }
  }

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', event.id)
    .eq('org_id', org.id)

  if (error) {
    return { error: 'Could not update status.' }
  }

  // Restoring from cancelled may auto-promote to 'on' when headcount meets the minimum.
  if (event.status === 'cancelled' && status === 'tentative') {
    await supabase.rpc('maybe_promote_event', { p_event_id: event.id })
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/sessions/${eventId}`)

  return { ok: true }
}

export async function updateEventAnnouncement(
  orgSlug: string,
  eventId: string,
  announcement: string,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()
  const text = announcement.trim()

  if (text.length > 500) {
    return { error: 'Announcement must be 500 characters or fewer.' }
  }

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id')
    .eq('short_id', eventId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError || !event) {
    return { error: 'Session not found.' }
  }

  const { error } = await supabase
    .from('events')
    .update({ announcement: text })
    .eq('id', event.id)
    .eq('org_id', org.id)

  if (error) {
    return { error: 'Could not save announcement.' }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/sessions/${eventId}`)

  return { ok: true }
}

export async function deleteEvent(
  orgSlug: string,
  eventId: string,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, schedule_id, starts_at')
    .eq('short_id', eventId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }
  if (!event) {
    return { error: 'Session not found.' }
  }

  // Recurring future sessions: record a skip before deleting so the nightly
  // materializer never recreates this occurrence.
  if (event.schedule_id && new Date(event.starts_at) >= new Date()) {
    const { error: skipError } = await supabase.from('schedule_event_skips').upsert(
      {
        org_id: org.id,
        schedule_id: event.schedule_id,
        starts_at: event.starts_at,
      },
      { onConflict: 'schedule_id,starts_at', ignoreDuplicates: true },
    )

    if (skipError) {
      return { error: skipError.message }
    }
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', event.id)
    .eq('org_id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export type UpdateScheduleMode = 'forward_only' | 'all_scheduled'

export async function updateSchedule(
  orgSlug: string,
  scheduleId: string,
  mode: UpdateScheduleMode,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const parsed = parseScheduleFormData(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }
  if (!existing) {
    return { error: 'Schedule not found.' }
  }

  const before = existing as Schedule
  const values = parsed.values

  const locationCheck = await assertLocationInOrg(supabase, org.id, values.locationId)
  if ('error' in locationCheck) {
    return { error: locationCheck.error }
  }

  const anchorDate = new Date().toLocaleDateString('en-CA', {
    timeZone: values.timezone || 'UTC',
  })

  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      location_id: values.locationId,
      title: values.title,
      byweekday: values.byweekday,
      start_time: values.startTime,
      timezone: values.timezone,
      capacity: values.capacity,
      min_players: values.minPlayers,
      duration_min: values.durationMin,
      interval_weeks: values.intervalWeeks,
      anchor_date: anchorDate,
      additional_information: values.additionalInformation,
    })
    .eq('id', scheduleId)
    .eq('org_id', org.id)

  if (updateError) {
    return { error: updateError.message }
  }

  if (mode === 'all_scheduled') {
    const now = new Date().toISOString()
    const structural = isStructuralScheduleChange(before, values)

    if (structural) {
      const { error: deleteEventsError } = await supabase
        .from('events')
        .delete()
        .eq('schedule_id', scheduleId)
        .eq('org_id', org.id)
        .gte('starts_at', now)

      if (deleteEventsError) {
        return { error: deleteEventsError.message }
      }

      try {
        await materializeEvents({ orgId: org.id })
      } catch {
        // swallow — schedule was updated; cron will fill sessions
      }
    } else {
      const { error: patchEventsError } = await supabase
        .from('events')
        .update({
          location_id: values.locationId,
          capacity: values.capacity,
          min_players: values.minPlayers,
          timezone: values.timezone,
          additional_information: values.additionalInformation,
        })
        .eq('schedule_id', scheduleId)
        .eq('org_id', org.id)
        .gte('starts_at', now)

      if (patchEventsError) {
        return { error: patchEventsError.message }
      }
    }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export type DeleteScheduleMode = 'schedule_only' | 'with_future_events'

export async function deleteSchedule(
  orgSlug: string,
  scheduleId: string,
  mode: DeleteScheduleMode,
  options?: { acknowledgeSignupLoss?: boolean },
): Promise<{ ok: true } | { error: string }> {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { data: schedule, error: fetchError } = await supabase
    .from('schedules')
    .select('id')
    .eq('id', scheduleId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }
  if (!schedule) {
    return { error: 'Schedule not found.' }
  }

  if (mode === 'with_future_events') {
    const impact = await getScheduleDeleteImpact(org.id, scheduleId)
    if (impact.signupCount > 0 && !options?.acknowledgeSignupLoss) {
      return {
        error: 'Confirm that you want to delete sessions with existing sign-ups.',
      }
    }

    const now = new Date().toISOString()
    const { error: deleteEventsError } = await supabase
      .from('events')
      .delete()
      .eq('schedule_id', scheduleId)
      .eq('org_id', org.id)
      .gte('starts_at', now)

    if (deleteEventsError) {
      return { error: deleteEventsError.message }
    }
  }

  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('org_id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function materializeOrgEvents(orgSlug: string) {
  const org = await requireOrgAdmin(orgSlug)

  try {
    const count = await materializeEvents({ orgId: org.id })
    revalidatePath(`/console/${orgSlug}`)
    revalidatePath(`/console/${orgSlug}/settings`)
    revalidatePath(`/org/${orgSlug}`)
    return { ok: true, count }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Materialization failed'
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return {
        error: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local to generate events.',
      }
    }
    return { error: msg }
  }
}

export async function updateOrgProfile(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!name) {
    return { error: 'Group name is required.' }
  }

  const { error } = await supabase
    .from('orgs')
    .update({ name, description })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/branding`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

function revalidateOrgBrandingPaths(orgSlug: string) {
  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/branding`)
  revalidatePath(`/org/${orgSlug}`)
}

async function updateOrgLogoUrl(orgSlug: string, logoUrl: string | null) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('orgs')
    .update({
      branding: {
        logo_url: logoUrl,
        accent_color: org.branding.accent_color,
        links: org.branding.links,
      },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidateOrgBrandingPaths(orgSlug)
  return { ok: true as const, logoUrl }
}

function friendlyLogoStorageError(message: string): string {
  if (message.includes('row-level security') || message.includes('security policy')) {
    return 'Upload failed due to a permissions error. Try again in a moment.'
  }
  return message
}

export async function uploadOrgLogo(orgSlug: string, formData: FormData) {
  let org
  try {
    org = await requireOrgAdmin(orgSlug)
  } catch {
    return { error: 'Not authorized.' }
  }

  // Storage writes use the service role after the membership check above.
  const admin = createAdminClient()

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    return { error: 'Choose an image to upload.' }
  }

  const validation = await validateLogoFileContent(file)
  if (!validation.ok) {
    return { error: validation.error }
  }

  const ext = extensionForMime(validation.mime)
  const storagePath = buildOrgLogoPath(org.id, org.name, ext)
  const previousPath = parseOurBucketLogoPath(org.branding.logo_url)

  try {
    const { error: uploadError } = await admin.storage
      .from(ORG_LOGO_BUCKET)
      .upload(storagePath, file, { contentType: validation.mime })

    if (uploadError) {
      return { error: friendlyLogoStorageError(uploadError.message) }
    }

    const logoUrl = publicLogoUrl(storagePath)
    const updateResult = await updateOrgLogoUrl(orgSlug, logoUrl)
    if ('error' in updateResult) {
      // Roll back the new object when the DB update fails (safe when path changed).
      if (previousPath !== storagePath) {
        await admin.storage.from(ORG_LOGO_BUCKET).remove([storagePath])
      }
      return updateResult
    }

    if (previousPath && previousPath !== storagePath) {
      await admin.storage.from(ORG_LOGO_BUCKET).remove([previousPath])
    }

    return { ok: true as const, logoUrl }
  } catch {
    return { error: 'Upload failed. Try again.' }
  }
}

export async function removeOrgLogo(orgSlug: string) {
  let org
  try {
    org = await requireOrgAdmin(orgSlug)
  } catch {
    return { error: 'Not authorized.' }
  }

  const admin = createAdminClient()
  const storagePath = parseOurBucketLogoPath(org.branding.logo_url)

  try {
    const updateResult = await updateOrgLogoUrl(orgSlug, null)
    if ('error' in updateResult) {
      return updateResult
    }

    if (storagePath) {
      const { error: removeError } = await admin.storage.from(ORG_LOGO_BUCKET).remove([storagePath])
      if (removeError) {
        return { error: 'Logo removed from your group, but cleanup failed. Try uploading again.' }
      }
    }

    return { ok: true as const }
  } catch {
    return { error: 'Remove failed. Try again.' }
  }
}

export async function updateBranding(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const accentColor = String(formData.get('accent_color') ?? '').trim()
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#2563eb'

  const { error } = await supabase
    .from('orgs')
    .update({
      branding: {
        logo_url: org.branding.logo_url,
        accent_color: accent,
        links: org.branding.links,
      },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidateOrgBrandingPaths(orgSlug)
  return { ok: true }
}

export async function updateOrgLinks(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const links = formData
    .getAll('link')
    .map((v) => normalizeLinkUrl(String(v)))
    .filter((v): v is string => v != null)
    .slice(0, MAX_ORG_LINKS)

  const { error } = await supabase
    .from('orgs')
    .update({
      branding: {
        logo_url: org.branding.logo_url,
        accent_color: org.branding.accent_color,
        links,
      },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/branding`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function updateOrgFeatures(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const features: OrgFeatures = {
    user_badges: formData.get('user_badges') === 'on',
    leaderboard: formData.get('leaderboard') === 'on',
    returning_signup_modal: formData.get('returning_signup_modal') === 'on',
    public_roster: formData.get('public_roster') === 'on',
    guest_signups: formData.get('guest_signups') === 'on',
    session_feedback: formData.get('session_feedback') === 'on',
    group_rules: formData.get('group_rules') === 'on',
  }

  const { error } = await supabase
    .from('orgs')
    .update({
      settings: { ...orgSettings(org), features },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/settings`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function updateOrgWaitlistSettings(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const raw = String(formData.get('promotion_mode') ?? 'strict_fifo')
  const promotion_mode: OrgWaitlistSettings['promotion_mode'] =
    raw === 'skip_ahead' ? 'skip_ahead' : 'strict_fifo'

  const current = orgSettings(org)

  const { error } = await supabase
    .from('orgs')
    .update({
      settings: {
        ...current,
        waitlist: { promotion_mode },
      },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/settings`)
  return { ok: true }
}

export async function updateGroupRulesText(orgSlug: string, formData: FormData) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const text = String(formData.get('rules_text') ?? '')
  const validationError = validateGroupRulesText(text)
  if (validationError) {
    return { error: validationError }
  }

  const current = orgSettings(org)
  const currentRules = orgGroupRules(current)
  const nextRules = buildNextGroupRulesOnSave(currentRules, text)

  const { error } = await supabase
    .from('orgs')
    .update({
      settings: {
        ...current,
        group_rules: nextRules,
      },
    })
    .eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/settings`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

export async function refreshGroupRules(orgSlug: string) {
  const org = await requireOrgAdmin(orgSlug)
  const supabase = await createClient()

  const { error } = await supabase.rpc('organizer_refresh_group_rules', {
    p_org_id: org.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/console/${orgSlug}/settings`)
  revalidatePath(`/org/${orgSlug}`)
  return { ok: true }
}

async function requireOrgOwner(orgSlug: string) {
  const org = await getOrgForMember(orgSlug)
  if (!org) {
    return { error: 'Not authorized' as const }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' as const }
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.role !== 'owner') {
    return { error: 'Only the group owner can delete this group.' as const }
  }

  return { org }
}

export async function deleteOrg(orgSlug: string, confirmSlug: string): Promise<{ error?: string }> {
  const ownerResult = await requireOrgOwner(orgSlug)
  if ('error' in ownerResult) {
    return { error: ownerResult.error }
  }

  const { org } = ownerResult
  if (normalizeSlug(confirmSlug) !== org.slug) {
    return { error: 'Slug does not match. Type the exact slug to confirm.' }
  }

  const admin = createAdminClient()
  try {
    await deleteOrgLogoStorage(admin, org.id, org.branding.logo_url)
  } catch (err) {
    console.error('deleteOrg: failed to remove logo files', err)
  }

  const supabase = await createClient()
  const { error } = await supabase.from('orgs').delete().eq('id', org.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/console')
  redirect('/console')
}

function revalidateInteriorOrgPaths(orgSlug: string) {
  revalidatePath(`/console/${orgSlug}/settings`)
  revalidatePath(`/console/${orgSlug}/schedules`)
  revalidatePath(`/console/${orgSlug}/sessions`)
  revalidatePath(`/console/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath('/console')
}

export async function interiorAddOrgOwner(
  orgSlug: string,
  email: string,
): Promise<{ error?: string; ok?: boolean; email?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isInteriorOperator(user?.id)) {
    return { error: 'Not authorized' }
  }

  const ownerResult = await requireOrgOwner(orgSlug)
  if ('error' in ownerResult) {
    return { error: ownerResult.error }
  }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed) {
    return { error: 'Email is required.' }
  }

  const { data, error } = await supabase.rpc('interior_add_org_owner', {
    p_org_id: ownerResult.org.id,
    p_email: trimmed,
  })

  if (error) {
    return { error: error.message }
  }

  const payload = data as { email?: string } | null
  revalidateInteriorOrgPaths(orgSlug)
  return { ok: true, email: payload?.email ?? trimmed }
}

export async function interiorSetOrgTimezone(
  orgSlug: string,
  timezone: string,
): Promise<{ error?: string; ok?: boolean; timezone?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isInteriorOperator(user?.id)) {
    return { error: 'Not authorized' }
  }

  const ownerResult = await requireOrgOwner(orgSlug)
  if ('error' in ownerResult) {
    return { error: ownerResult.error }
  }

  const tz = timezone.trim()
  if (!tz) {
    return { error: 'Timezone is required.' }
  }

  const { data, error } = await supabase.rpc('interior_set_org_timezone', {
    p_org_id: ownerResult.org.id,
    p_timezone: tz,
  })

  if (error) {
    return { error: error.message }
  }

  const payload = data as { timezone?: string } | null
  revalidateInteriorOrgPaths(orgSlug)
  return { ok: true, timezone: payload?.timezone ?? tz }
}

/** Live availability check for the org-creation form. */
export async function checkSlugAvailability(
  slug: string,
): Promise<{ available: boolean; reason?: string }> {
  const normalized = normalizeSlug(slug)

  if (!normalized) {
    return { available: false, reason: 'empty' }
  }
  if (!isValidSlug(normalized)) {
    return { available: false, reason: 'invalid' }
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('orgs')
    .select('id')
    .eq('slug', normalized)
    .maybeSingle()

  return { available: !data }
}
