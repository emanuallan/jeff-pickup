"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function resolveOrgId(
	supabase: Awaited<ReturnType<typeof createClient>>,
	orgId?: string | null,
	orgSlug?: string | null,
): Promise<string | null> {
	if (orgId) return orgId;
	if (!orgSlug) return null;

	const { data, error } = await supabase
		.from("orgs")
		.select("id")
		.eq("slug", orgSlug)
		.maybeSingle();

	if (error || !data) return null;
	return data.id;
}

export async function markOrganizerNotificationRead(notificationId: string) {
	const supabase = await createClient();
	const { error } = await supabase.rpc("mark_organizer_notification_read", {
		p_notification_id: notificationId,
	});
	if (error) return { error: error.message };
	revalidatePath("/console", "layout");
	return { ok: true as const };
}

export async function markAllOrganizerNotificationsRead(args?: {
	orgId?: string | null;
	orgSlug?: string | null;
}) {
	const supabase = await createClient();
	const orgId = await resolveOrgId(
		supabase,
		args?.orgId,
		args?.orgSlug,
	);
	const { error } = await supabase.rpc("mark_all_organizer_notifications_read", {
		p_org_id: orgId,
	});
	if (error) return { error: error.message };
	revalidatePath("/console", "layout");
	return { ok: true as const };
}

export async function dismissOrganizerNotification(notificationId: string) {
	const supabase = await createClient();
	const { error } = await supabase.rpc("dismiss_organizer_notification", {
		p_notification_id: notificationId,
	});
	if (error) return { error: error.message };
	revalidatePath("/console", "layout");
	return { ok: true as const };
}

export async function dismissAllOrganizerNotifications(args?: {
	orgId?: string | null;
	orgSlug?: string | null;
}) {
	const supabase = await createClient();
	const orgId = await resolveOrgId(
		supabase,
		args?.orgId,
		args?.orgSlug,
	);
	const { error } = await supabase.rpc("dismiss_all_organizer_notifications", {
		p_org_id: orgId,
	});
	if (error) return { error: error.message };
	revalidatePath("/console", "layout");
	return { ok: true as const };
}
