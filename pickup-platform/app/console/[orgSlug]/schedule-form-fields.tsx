import type { Location } from "@/lib/locations";
import type { Schedule } from "@/lib/schedules";
import { consoleInput } from "../_components/console-ui";

const WEEKDAYS = [
	{ value: 0, label: "Sun" },
	{ value: 1, label: "Mon" },
	{ value: 2, label: "Tue" },
	{ value: 3, label: "Wed" },
	{ value: 4, label: "Thu" },
	{ value: 5, label: "Fri" },
	{ value: 6, label: "Sat" },
];

export function scheduleStartTimeInputValue(startTime: string): string {
	return startTime.slice(0, 5);
}

type Props = {
	locations: Location[];
	schedule?: Schedule;
	timezone: string;
};

export function ScheduleFormFields({ locations, schedule, timezone }: Props) {
	const selectedDays = schedule?.byweekday ?? [];

	return (
		<>
			<input type="hidden" name="timezone" value={timezone} />

			<input
				name="title"
				defaultValue={schedule?.title}
				placeholder="Recurring session name"
				className={consoleInput}
			/>

			<select
				name="location_id"
				required
				className={consoleInput}
				defaultValue={schedule?.location_id ?? locations[0]?.id}
			>
				{locations.map((loc) => (
					<option key={loc.id} value={loc.id}>
						{loc.label}
					</option>
				))}
			</select>

			<fieldset>
				<legend className="mb-2 text-xs text-zinc-500">Days</legend>
				<div className="flex flex-wrap gap-2">
					{WEEKDAYS.map((d) => (
						<label
							key={d.value}
							className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs transition has-checked:border-indigo-500 has-checked:bg-indigo-500/10"
						>
							<input
								type="checkbox"
								name="byweekday"
								value={d.value}
								defaultChecked={selectedDays.includes(d.value)}
								className="accent-indigo-500"
							/>
							{d.label}
						</label>
					))}
				</div>
			</fieldset>

			<div className="grid grid-cols-2 gap-3">
				<label className="block">
					<span className="text-xs text-zinc-500">Start time</span>
					<input
						name="start_time"
						type="time"
						defaultValue={scheduleStartTimeInputValue(
							schedule?.start_time ?? "18:00",
						)}
						required
						className={`mt-1 ${consoleInput}`}
					/>
				</label>
				<label className="block">
					<span className="text-xs text-zinc-500">Duration (min)</span>
					<input
						name="duration_min"
						type="number"
						min={15}
						max={480}
						defaultValue={schedule?.duration_min ?? 90}
						className={`mt-1 ${consoleInput}`}
					/>
				</label>
			</div>

			<label className="block">
				<span className="text-xs text-zinc-500">Frequency</span>
				<select
					name="interval_weeks"
					defaultValue={String(schedule?.interval_weeks ?? 1)}
					className={`mt-1 ${consoleInput}`}
				>
					<option value="1">Every week</option>
					<option value="2">Every 2 weeks</option>
					<option value="3">Every 3 weeks</option>
					<option value="4">Every 4 weeks</option>
				</select>
			</label>

			<div className="grid grid-cols-2 gap-3">
				<label className="block">
					<span className="text-xs text-zinc-500">Capacity (optional)</span>
					<input
						name="capacity"
						type="number"
						min={2}
						max={999}
						placeholder="No limit"
						defaultValue={schedule?.capacity ?? undefined}
						className={`mt-1 ${consoleInput}`}
					/>
				</label>
				<label className="block">
					<span className="text-xs text-zinc-500">
						Min participants (optional)
					</span>
					<input
						name="min_players"
						type="number"
						min={2}
						max={999}
						placeholder="No minimum"
						defaultValue={schedule?.min_players ?? undefined}
						className={`mt-1 ${consoleInput}`}
					/>
				</label>
			</div>

			<p className="text-xs text-zinc-500">Timezone: {timezone}</p>
		</>
	);
}
