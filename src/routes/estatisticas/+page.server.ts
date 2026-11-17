import { lisbonNow } from '$lib/server/calendar';
import { getSeason } from '$lib/server/season';
import { getPrograms } from '$lib/server/store';
import { programLabel, seasonOf, seasonRange } from '$lib/programs';
import { bySection } from '$lib/sections';
import { RECORDED_STATES, type MemberState } from '$lib/types';
import type { PageServerLoad } from './$types';

/** A program or a whole season, as offered in the picker */
interface Period {
	/** Value of the `p` query parameter: a program's id, or a season such as "2026/27" */
	value: string;
	label: string;
	from: string;
	to: string;
}

export const load: PageServerLoad = async ({ url }) => {
	const today = lisbonNow().slice(0, 10);
	const programs = await getPrograms();

	// Newest first: each season, followed by its programs
	const seasons = [...new Set([seasonOf(today), ...programs.map((p) => seasonOf(p.start))])].sort().reverse();
	const periods = seasons.flatMap((season): Period[] => [
		{ value: season, label: `Temporada ${season}`, ...seasonRange(season) },
		...programs
			.filter((p) => seasonOf(p.start) === season)
			.reverse()
			.map((p) => ({ value: p.id, label: programLabel(p), from: p.start, to: p.end }))
	]);

	// Without a choice: the program going on, else the last one to have started, else the season
	const started = programs.filter((p) => p.start <= today);
	const current = started.find((p) => today <= p.end) ?? started.at(-1);
	const period =
		periods.find((p) => p.value === url.searchParams.get('p')) ??
		periods.find((p) => p.value === (current?.id ?? seasonOf(today)))!;

	const { events, records, members } = await getSeason(period.from);
	const inPeriod = (start: string) => period.from <= start.slice(0, 10) && start.slice(0, 10) <= period.to;
	// The grid has a column per recorded event
	const columns = events
		.filter((event) => inPeriod(event.start) && records.has(event.key))
		.map((event) => ({ key: event.key, title: event.title, start: event.start }));
	const recorded = columns.map((column) => records.get(column.key)!);

	const rows = new Map(
		members.map((member) => {
			const cells = recorded.map(
				(record): MemberState => RECORDED_STATES.find((state) => record[state].includes(member.id)) ?? 'notCalled'
			);
			const count = (state: MemberState) => cells.filter((cell) => cell === state).length;
			const [present, late, absent, justified] = RECORDED_STATES.map(count);
			// Events where the member is in no list don't count: they weren't expected at those
			const expected = present + late + absent;
			return [
				member.id,
				{
					cells,
					present,
					late,
					justified,
					absent,
					/** Share of the events without a justified absence that the member came to, in percent. A half presence counts as half. */
					rate: expected > 0 ? Math.round(((present + late / 2) / expected) * 100) : null
				}
			];
		})
	);

	// Members who have since become inactive stay in the periods they took part in
	const listed = members.filter(
		(m) => m.status !== 'inactive' || rows.get(m.id)!.cells.some((cell) => cell !== 'notCalled')
	);

	return {
		periods: periods.map(({ value, label }) => ({ value, label })),
		period: { value: period.value, label: period.label },
		columns,
		sections: bySection(listed).map(({ section, onCall, members }) => ({
			section,
			onCall,
			members: members.map((member) => ({ ...member, ...rows.get(member.id)! }))
		}))
	};
};
