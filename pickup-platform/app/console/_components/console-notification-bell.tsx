"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizerNotification } from "@/lib/organizer-notifications";
import {
	formatNotificationTime,
	formatOrganizerNotificationCopy,
	organizerNotificationHref,
} from "@/lib/organizer-notifications";
import {
	dismissAllOrganizerNotifications,
	dismissOrganizerNotification,
	markAllOrganizerNotificationsRead,
	markOrganizerNotificationRead,
} from "../notification-actions";
import { BottomSheet, useMobileSheetLayout } from "@/app/_components/bottom-sheet";

type Props = {
	initialNotifications: OrganizerNotification[];
	initialUnreadCount: number;
};

type DismissAllScope =
	| { type: "all" }
	| { type: "org"; orgId: string | null; orgSlug: string };

function orgSlugFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/console\/([^/]+)/);
	const slug = match?.[1];
	if (!slug || slug === "new") return null;
	return slug;
}

function matchesDismissAllScope(
	notification: OrganizerNotification,
	scope: DismissAllScope,
): boolean {
	if (scope.type === "all") return true;
	if (scope.orgId && notification.org_id === scope.orgId) return true;
	if (notification.org_slug === scope.orgSlug) return true;
	return false;
}

function applyDismissAllScope(
	notifications: OrganizerNotification[],
	scope: DismissAllScope | null,
): OrganizerNotification[] {
	if (!scope) return notifications;
	return notifications.filter((n) => !matchesDismissAllScope(n, scope));
}

function kindBadge(kind: OrganizerNotification["kind"]): {
	label: string;
	className: string;
} {
	switch (kind) {
		case "new_signup_batch":
			return {
				label: "New",
				className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
			};
		case "returning_signup_batch":
			return {
				label: "Returning",
				className: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
			};
		case "unregister_immediate":
			return {
				label: "Soon",
				className: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
			};
		case "unregister_batch":
			return {
				label: "Left",
				className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
			};
		case "waitlist_signup_batch":
			return {
				label: "Waitlist",
				className: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
			};
		case "session_feedback_immediate":
			return {
				label: "Feedback",
				className: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
			};
	}
}

function NotificationPanelContent({
	notifications,
	unreadCount,
	showOrgName,
	pathname,
	onClose,
	onMarkRead,
	onMarkAllRead,
	onDismiss,
	onDismissAll,
}: {
	notifications: OrganizerNotification[];
	unreadCount: number;
	showOrgName: boolean;
	pathname: string;
	onClose: () => void;
	onMarkRead: (id: string) => void;
	onMarkAllRead: () => void;
	onDismiss: (id: string) => void;
	onDismissAll: () => void;
}) {
	return (
		<>
			<div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-zinc-100">Notifications</p>
					<p className="text-xs text-zinc-500">Roster & session feedback</p>
				</div>
				{notifications.length > 0 ? (
					<div className="flex shrink-0 items-center gap-3">
						{unreadCount > 0 ? (
							<button
								type="button"
								onClick={() => void onMarkAllRead()}
								className="text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
							>
								Mark read
							</button>
						) : null}
						<button
							type="button"
							onClick={() => void onDismissAll()}
							className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
						>
							Clear all
						</button>
					</div>
				) : null}
			</div>

			{notifications.length === 0 ? (
				<p className="px-4 py-8 text-center text-sm text-zinc-500">
					No notifications yet.
				</p>
			) : (
				<ul className="min-h-0 flex-1 overflow-y-auto sm:max-h-80">
					{notifications.map((n) => {
						const { title, detail } = formatOrganizerNotificationCopy(n);
						const badge = kindBadge(n.kind);
						const href = organizerNotificationHref(n);
						const isUnread = !n.read_at;
						const isActive = pathname === href;
						const when = formatNotificationTime(n.created_at);
						const context = showOrgName ? `${n.org_name} · ${detail}` : detail;
						const subtitle = `${context} · ${when}`;

						return (
							<li
								key={n.id}
								className="flex border-b border-white/5 last:border-0"
							>
								<Link
									href={href}
									onClick={() => {
										if (isUnread) void onMarkRead(n.id);
										onClose();
									}}
									className={`flex min-w-0 flex-1 items-start gap-2 px-4 py-3 transition hover:bg-white/5 ${
										isActive ? "bg-indigo-500/5" : ""
									} ${isUnread ? "bg-white/2" : ""}`}
								>
									<div className="min-w-0 flex-1">
										<span
											className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badge.className}`}
										>
											{badge.label}
										</span>
										<p className="mt-1.5 text-sm leading-snug text-zinc-100">{title}</p>
										<p className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</p>
									</div>
									{isUnread ? (
										<span
											aria-hidden
											className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
										/>
									) : null}
								</Link>
								<button
									type="button"
									aria-label="Clear notification"
									onClick={() => void onDismiss(n.id)}
									className="shrink-0 px-3 py-3 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
								>
									<span aria-hidden className="text-lg leading-none">
										×
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</>
	);
}

export function ConsoleNotificationBell({
	initialNotifications,
	initialUnreadCount,
}: Props) {
	const pathname = usePathname();
	const orgSlug = orgSlugFromPathname(pathname);
	const isMobile = useMobileSheetLayout();

	const scopedFromServer = useMemo(
		() =>
			orgSlug
				? initialNotifications.filter((n) => n.org_slug === orgSlug)
				: initialNotifications,
		[orgSlug, initialNotifications],
	);

	const scopedUnreadFromServer = useMemo(
		() =>
			orgSlug
				? scopedFromServer.filter((n) => !n.read_at).length
				: initialUnreadCount,
		[orgSlug, scopedFromServer, initialUnreadCount],
	);

	const [open, setOpen] = useState(false);
	const [notifications, setNotifications] = useState(scopedFromServer);
	const [unreadCount, setUnreadCount] = useState(scopedUnreadFromServer);
	const panelRef = useRef<HTMLDivElement>(null);
	const dismissAllScopeRef = useRef<DismissAllScope | null>(null);
	const dismissedIdsRef = useRef<Set<string>>(new Set());

	const syncFromServer = useCallback(
		(serverNotifications: OrganizerNotification[]) => {
			let next = applyDismissAllScope(
				serverNotifications,
				dismissAllScopeRef.current,
			);
			if (dismissedIdsRef.current.size > 0) {
				next = next.filter((n) => !dismissedIdsRef.current.has(n.id));
			}

			if (dismissAllScopeRef.current) {
				const scope = dismissAllScopeRef.current;
				const stillPresent = serverNotifications.some((n) =>
					matchesDismissAllScope(n, scope),
				);
				if (!stillPresent) {
					dismissAllScopeRef.current = null;
				}
			}

			setNotifications(next);
			setUnreadCount(next.filter((n) => !n.read_at).length);
		},
		[],
	);

	useEffect(() => {
		syncFromServer(scopedFromServer);
	}, [scopedFromServer, syncFromServer]);

	useEffect(() => {
		if (!open || isMobile) return;
		function onDocClick(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [open, isMobile]);

	const handleMarkRead = useCallback(async (id: string) => {
		setNotifications((prev) =>
			prev.map((n) =>
				n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
			),
		);
		setUnreadCount((c) => Math.max(0, c - 1));
		const result = await markOrganizerNotificationRead(id);
		if (result?.error) {
			syncFromServer(scopedFromServer);
		}
	}, [scopedFromServer, syncFromServer]);

	const handleMarkAllRead = useCallback(async () => {
		setNotifications((prev) =>
			prev.map((n) => ({
				...n,
				read_at: n.read_at ?? new Date().toISOString(),
			})),
		);
		setUnreadCount(0);
		const result = await markAllOrganizerNotificationsRead(
			orgSlug ? { orgSlug } : undefined,
		);
		if (result?.error) {
			syncFromServer(scopedFromServer);
		}
	}, [orgSlug, scopedFromServer, syncFromServer]);

	const handleDismiss = useCallback(async (id: string) => {
		dismissedIdsRef.current.add(id);
		setNotifications((prev) => {
			const dismissed = prev.find((n) => n.id === id);
			if (dismissed && !dismissed.read_at) {
				setUnreadCount((c) => Math.max(0, c - 1));
			}
			return prev.filter((n) => n.id !== id);
		});
		const result = await dismissOrganizerNotification(id);
		if (result?.error) {
			dismissedIdsRef.current.delete(id);
			syncFromServer(scopedFromServer);
		} else {
			dismissedIdsRef.current.delete(id);
		}
	}, [scopedFromServer, syncFromServer]);

	const handleDismissAll = useCallback(async () => {
		const scope: DismissAllScope = orgSlug
			? {
					type: "org",
					orgId:
						notifications.find((n) => n.org_slug === orgSlug)?.org_id ?? null,
					orgSlug,
				}
			: { type: "all" };

		dismissAllScopeRef.current = scope;
		for (const n of notifications) {
			dismissedIdsRef.current.add(n.id);
		}
		setNotifications([]);
		setUnreadCount(0);

		const result = await dismissAllOrganizerNotifications(
			orgSlug ? { orgSlug, orgId: scope.type === "org" ? scope.orgId : null } : undefined,
		);

		if (result?.error) {
			dismissAllScopeRef.current = null;
			for (const n of notifications) {
				dismissedIdsRef.current.delete(n.id);
			}
			syncFromServer(scopedFromServer);
		}
	}, [notifications, orgSlug, scopedFromServer, syncFromServer]);

	const showOrgName = !orgSlug;

	const panelContent = (
		<NotificationPanelContent
			notifications={notifications}
			unreadCount={unreadCount}
			showOrgName={showOrgName}
			pathname={pathname}
			onClose={() => setOpen(false)}
			onMarkRead={(id) => void handleMarkRead(id)}
			onMarkAllRead={() => void handleMarkAllRead()}
			onDismiss={(id) => void handleDismiss(id)}
			onDismissAll={() => void handleDismissAll()}
		/>
	);

	const desktopPanelClassName =
		"absolute right-0 top-full z-50 mt-2 flex max-h-[min(24rem,calc(100dvh-5rem))] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-md";

	return (
		<div ref={panelRef} className="relative">
			<button
				type="button"
				aria-label={
					unreadCount > 0
						? `${unreadCount} unread notifications`
						: "Notifications"
				}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
			>
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					className="h-5 w-5"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
					/>
				</svg>
				{unreadCount > 0 ? (
					<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				) : null}
			</button>

			{open && isMobile ? (
				<BottomSheet
					open
					onClose={() => setOpen(false)}
					variant="top"
					ariaLabel="Notifications"
				>
					{panelContent}
				</BottomSheet>
			) : null}

			{open && !isMobile ? (
				<div role="dialog" aria-label="Notifications" className={desktopPanelClassName}>
					{panelContent}
				</div>
			) : null}
		</div>
	);
}
