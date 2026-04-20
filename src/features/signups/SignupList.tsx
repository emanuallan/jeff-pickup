import type { Signup } from "./types";

export function SignupList(props: {
	labels: {
		players: string;
		total: string;
		loading: string;
		emptyList: string;
		unregister: string;
		unregisterHint: string;
		goal: string;
	};
	signups: Signup[];
	loading?: boolean;
	mySignupId?: string;
	canUnregister?: boolean;
	onUnregister?: () => void;
	goal?: number;
	adminCanRemove?: boolean;
	onAdminRemove?: (signupId: string) => void;
}) {
	const goal = props.goal ?? 0;
	const progressPct =
		goal > 0
			? Math.min(100, Math.round((props.signups.length / goal) * 100))
			: 0;

	return (
		<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
			<div className="flex items-baseline justify-between gap-3">
				<div className="text-sm font-semibold">{props.labels.players}</div>
				<div className="text-xs text-[--muted]">
					{props.signups.length} {props.labels.total}
				</div>
			</div>

			<div className="mt-3">
				{props.loading ? (
					<div className="text-sm text-[--muted]">{props.labels.loading}</div>
				) : props.signups.length === 0 ? (
					<div className="text-sm text-[--muted]">{props.labels.emptyList}</div>
				) : (
					<ol className="space-y-2">
						{props.signups.map((s, idx) => (
							<li
								key={s.id}
								className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2"
							>
								<div className="min-w-0">
									<div className="truncate text-sm font-medium">
										{idx + 1}. {s.player_name}
									</div>
								</div>
								<div className="ml-3 flex items-center gap-2">
									{props.adminCanRemove ? (
										<button
											type="button"
											aria-label="Remove player (admin)"
											title="Remove player"
											onClick={() => props.onAdminRemove?.(s.id)}
											className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/30 text-white/80 hover:bg-white/10"
										>
											<span className="text-base leading-none">🗑</span>
										</button>
									) : null}

									{props.mySignupId === s.id ? (
										<button
											type="button"
											aria-label="Unregister"
											title={
												props.canUnregister
													? props.labels.unregister
													: props.labels.unregisterHint
											}
											disabled={!props.canUnregister}
											onClick={props.onUnregister}
											className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/30 text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
										>
											<span className="text-lg leading-none">×</span>
										</button>
									) : null}
								</div>
							</li>
						))}
					</ol>
				)}
			</div>

			{goal > 0 ? (
				<div className="mt-8">
					<div className="flex items-baseline justify-between gap-3 text-xs">
						<div className="text-[--muted]">
							{props.signups.length} / {goal} {props.labels.goal}
						</div>
						<div className="text-[--muted]">{progressPct}%</div>
					</div>
					<div className="mt-2 h-2 w-full rounded-full bg-white/10">
						<div
							className="h-2 rounded-full bg-[var(--gold)]"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>
			) : null}
		</section>
	);
}
