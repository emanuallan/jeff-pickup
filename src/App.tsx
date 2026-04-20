import { useEffect, useMemo, useState } from "react";
import { todayLocalISODate, formatFriendlyDate } from "./lib/date";
import { loadPlayerName, savePlayerName } from "./lib/storage";
import {
	clearDeleteToken,
	loadDeleteToken,
	newUuid,
	saveDeleteToken,
} from "./lib/tokens";
import { supabase } from "./lib/supabase";
import {
	createSignup,
	fetchSignups,
	unregisterSignup,
} from "./features/signups/api";
import { LOCATIONS } from "./features/signups/locations";
import type { LocationId, Signup } from "./features/signups/types";
import { SignupForm } from "./features/signups/SignupForm";
import { SignupList } from "./features/signups/SignupList";
import {
	fetchActiveLocation,
	setActiveLocation,
	fetchActiveTime,
	setActiveTime,
} from "./features/settings/api";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/share/g/18ruTArVRB/";
const WHATSAPP_GROUP_URL =
	"https://l.facebook.com/l.php?u=https%3A%2F%2Fchat.whatsapp.com%2FCGKl1hIhaoJ7zjIPNVcEZ1%3Fmode%3Dems_copy_c%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExQW9UQlRENGxmc3hLNHN2cXNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR72867lrLGpSLAi0MElnoTyy_nIsItUv2vxSLi8zZ1QzrOi-jOLBqAl7TLzyw_aem_Wbdxa-HIEA8qr-i3utN1lQ&h=AT6N82Mu8Hu_IXFtfs4j2h9BgyMVkWAPNMTluGdsjlWeEHkJUIzGLESkkKck45Y4J0N_lT7kakBuycLRMuGQcJUU4RPHIIEvnGr2eIWlMcK2Ob66nz05nQpcq1gt-5O9jJumtd60lrTp4VVSKieYVqeH5Ni_ji-Bn1w&__tn__=-UK-R&c[0]=AT48Ry3TVtd0cmpNXdwgk7NKkTr8trEBk7XG4hQIyKE4n6ALoLtj3recVAxIuvYOQP6CyQbUq_peDSCujGrN-5CG5DLG0Ul0WZksK15eA5POJxsviovx6L9vFOshNrICAVFGImFAc2F97_b2W1cK8xzuYWXJ1GAVtWc8krnONBoJvnarZ6eh8a-syfyuaxbO6QiG2TvHJMOYXJ8S9LRKim96UFm8";

function App() {
	const [playDate, setPlayDate] = useState(() => todayLocalISODate());
	const [playerName, setPlayerName] = useState(() => loadPlayerName());
	const [activeLocation, setActiveLocationState] =
		useState<LocationId>("shirley_hall_park");
	const [activeTime, setActiveTimeState] = useState<string>("18:00");

	const [signups, setSignups] = useState<Signup[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [adminOpen, setAdminOpen] = useState(false);
	const [adminBusy, setAdminBusy] = useState(false);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [, setAdminTapState] = useState(() => ({
		count: 0,
		lastTapMs: 0,
	}));

	const locationMeta = useMemo(
		() => LOCATIONS.find((l) => l.id === activeLocation) ?? LOCATIONS[0],
		[activeLocation],
	);

	const adminPinConfigured = Boolean(import.meta.env.VITE_ADMIN_PIN);

	useEffect(() => {
		savePlayerName(playerName);
	}, [playerName]);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			if (!supabase) return;
			try {
				const loc = await fetchActiveLocation();
				if (!cancelled) setActiveLocationState(loc);
			} catch {
				// ignore; default location will be used
			}
			try {
				const t = await fetchActiveTime();
				if (!cancelled) setActiveTimeState(t);
			} catch {
				// ignore; default time will be used
			}
			setLoading(true);
			setError(null);
			try {
				const data = await fetchSignups({ playDate, location: activeLocation });
				if (!cancelled) setSignups(data);
			} catch (e) {
				if (!cancelled) setError("Could not load the list. Please try again.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void run();
		return () => {
			cancelled = true;
		};
	}, [playDate, activeLocation]);

	const cleanedName = useMemo(
		() => playerName.trim().replace(/\s+/g, " "),
		[playerName],
	);

	const mySignup = useMemo(() => {
		const n = cleanedName.toLowerCase();
		if (!n) return null;
		return (
			signups.find((s) => s.player_name.trim().toLowerCase() === n) ?? null
		);
	}, [cleanedName, signups]);

	const myDeleteToken = useMemo(() => {
		if (!cleanedName) return "";
		return loadDeleteToken({
			playDate,
			location: activeLocation,
			playerName: cleanedName,
		});
	}, [activeLocation, cleanedName, playDate]);

	return (
		<div className="min-h-dvh px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-6 sm:px-6">
			<div className="mx-auto w-full max-w-md">
				<header className="flex items-center gap-3">
					<img
						src="/logo.JPG"
						alt="Jeff Pickup FC"
						className="h-14 w-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)] object-cover shadow-sm"
					/>
					<div className="min-w-0">
						<div className="text-lg font-semibold leading-tight">
							Jeff Pickup
						</div>
						<div className="text-sm text-[--muted] leading-tight">
							Jeffersonville Pick up Soccer
						</div>
					</div>
				</header>

				<main className="mt-6 space-y-4">
					<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<button
									type="button"
									className="text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-md"
									onClick={() => {
										if (!supabase) return;
										setAdminTapState((s) => {
											const now = Date.now();
											const reset = now - s.lastTapMs > 1200;
											const nextCount = reset ? 1 : s.count + 1;
											if (nextCount >= 5) {
												setAdminOpen(true);
												return { count: 0, lastTapMs: 0 };
											}
											return { count: nextCount, lastTapMs: now };
										});
									}}
								>
									Location & Time
								</button>
								<div className="mt-0.5 text-sm text-[--muted]">
									{formatFriendlyDate(playDate)} · {locationMeta.label} ·{" "}
									{activeTime}
								</div>
								<div className="mt-1 text-xs text-[--muted]">
									{locationMeta.addressLines.join(" · ")}
								</div>
							</div>
							<a
								className="shrink-0 rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
								href={locationMeta.mapsUrl}
								target="_blank"
								rel="noreferrer"
							>
								Open in Maps
							</a>
						</div>
					</section>

					{!supabase ? (
						<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
							<div className="text-sm font-semibold">Setup needed</div>
							<div className="mt-1 text-sm text-[--muted]">
								To enable shared signups, set{" "}
								<span className="font-mono text-xs text-[--text]">
									VITE_SUPABASE_URL
								</span>{" "}
								and{" "}
								<span className="font-mono text-xs text-[--text]">
									VITE_SUPABASE_ANON_KEY
								</span>
								.
							</div>
						</section>
					) : null}

					<SignupForm
						value={{ playDate, playerName }}
						onChange={(next) => {
							setPlayDate(next.playDate);
							setPlayerName(next.playerName);
						}}
						disabled={!supabase || submitting}
						error={error ?? undefined}
						onSubmit={async () => {
							if (!supabase) return;
							if (!cleanedName) {
								setError("Please enter your name.");
								return;
							}

							setSubmitting(true);
							setError(null);
							try {
								const deleteToken = newUuid();
								await createSignup({
									playDate,
									location: activeLocation,
									playerName: cleanedName,
									deleteToken,
								});
								saveDeleteToken({
									playDate,
									location: activeLocation,
									playerName: cleanedName,
									deleteToken,
								});
								setPlayerName(cleanedName);
								const data = await fetchSignups({
									playDate,
									location: activeLocation,
								});
								setSignups(data);
							} catch (e: unknown) {
								const msg =
									typeof e === "object" && e && "message" in e
										? String((e as any).message)
										: "";
								// Postgres unique violation via Supabase usually includes 23505
								if (msg.includes("23505")) {
									setError(
										"You’re already on the list for this day and location.",
									);
								} else {
									setError("Could not add you. Please try again.");
								}
							} finally {
								setSubmitting(false);
							}
						}}
					/>

					<SignupList
						signups={signups}
						loading={loading}
						mySignupId={mySignup?.id}
						canUnregister={Boolean(mySignup && myDeleteToken)}
						onUnregister={
							mySignup && myDeleteToken
								? async () => {
										setSubmitting(true);
										setError(null);
										try {
											await unregisterSignup({
												signupId: mySignup.id,
												deleteToken: myDeleteToken,
											});
											clearDeleteToken({
												playDate,
												location: activeLocation,
												playerName: cleanedName,
											});
											const data = await fetchSignups({
												playDate,
												location: activeLocation,
											});
											setSignups(data);
										} catch {
											setError("Could not remove you. Please try again.");
										} finally {
											setSubmitting(false);
										}
									}
								: undefined
						}
					/>

					<section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<a
							className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
							href={FACEBOOK_GROUP_URL}
							target="_blank"
							rel="noreferrer"
						>
							Facebook group
						</a>
						<a
							className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
							href={WHATSAPP_GROUP_URL}
							target="_blank"
							rel="noreferrer"
						>
							WhatsApp group
						</a>
					</section>
				</main>

				<footer className="mt-8 text-center text-xs text-[--muted]">
					haha madrid
				</footer>
			</div>

			{adminOpen ? (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
					role="dialog"
					aria-modal="true"
				>
					<div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[#0b0b0e] p-4 shadow-xl">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-sm font-semibold">Admin</div>
								<div className="mt-0.5 text-xs text-[--muted]">
									Set the active location and time shown to everyone.
								</div>
							</div>
							<button
								type="button"
								className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
								onClick={() => {
									setAdminError(null);
									setAdminOpen(false);
								}}
							>
								Close
							</button>
						</div>

						{adminError ? (
							<div className="mt-3 rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
								{adminError}
							</div>
						) : null}

						<div className="mt-4 space-y-3">
							<div className="rounded-2xl border border-[var(--border)] bg-black/20 p-3">
								<div className="text-xs font-medium text-[--muted]">
									Active time
								</div>
								<input
									type="time"
									className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
									value={activeTime}
									onChange={(e) => setActiveTimeState(e.target.value)}
								/>
								<button
									type="button"
									disabled={adminBusy || !supabase}
									className="mt-2 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
									onClick={async () => {
										if (!supabase) return;
										setAdminBusy(true);
										setAdminError(null);
										try {
											if (adminPinConfigured) {
												const pin = window.prompt("Admin PIN");
												if (!pin || pin !== String(import.meta.env.VITE_ADMIN_PIN)) {
													setAdminError("Incorrect PIN.");
													return;
												}
											}
											await setActiveTime(activeTime);
										} catch {
											setAdminError("Could not update time.");
										} finally {
											setAdminBusy(false);
										}
									}}
								>
									Save time
								</button>
							</div>

							<div className="grid grid-cols-1 gap-2">
							{LOCATIONS.map((l) => (
								<button
									key={l.id}
									type="button"
									disabled={adminBusy || !supabase}
									className="rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
									onClick={async () => {
										if (!supabase) return;
										setAdminBusy(true);
										setAdminError(null);
										try {
											if (adminPinConfigured) {
												const pin = window.prompt("Admin PIN");
												if (
													!pin ||
													pin !== String(import.meta.env.VITE_ADMIN_PIN)
												) {
													setAdminError("Incorrect PIN.");
													return;
												}
											}
											await setActiveLocation(l.id);
											setActiveLocationState(l.id);
											const data = await fetchSignups({
												playDate,
												location: l.id,
											});
											setSignups(data);
											setAdminOpen(false);
										} catch {
											setAdminError("Could not update location.");
										} finally {
											setAdminBusy(false);
										}
									}}
								>
									<div className="flex items-center justify-between gap-3">
										<span>{l.label}</span>
										{l.id === activeLocation ? (
											<span className="text-xs font-medium text-[var(--gold)]">
												Active
											</span>
										) : null}
									</div>
									<div className="mt-1 text-xs text-[--muted]">
										{l.addressLines.join(" · ")}
									</div>
								</button>
							))}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export default App;
