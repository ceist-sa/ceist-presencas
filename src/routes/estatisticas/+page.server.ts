import { lisbonNow } from '$lib/server/calendar';
import { getSeason } from '$lib/server/season';
import { getPrograms } from '$lib/server/store';
import { programLabel, programOf, seasonOf, seasonRange } from '$lib/programs';
import { bySection } from '$lib/sections';
import { stateIn, summarise } from '$lib/stats';
import type { PageServerLoad } from './$types';

/** A program or a whole season, as offered in the picker */
interface Period {
	/** Value of the `p` query parameter: a program's id, or a season such as "2026-2027" */
	value: string;
	label: string;
	/** The dates it can span, `YYYY-MM-DD` */
	from: string;
	to: string;
	/** Set when the period is a whole season: the dates alone don't say which events are in it */
	season?: string;
}

const earliest = (dates: string[]) => dates.reduce((a, b) => (a < b ? a : b));
const latest = (dates: string[]) => dates.reduce((a, b) => (a > b ? a : b));

export const load: PageServerLoad = async ({ url }) => {
	const today = lisbonNow().slice(0, 10);
	const programs = await getPrograms();
	// A program's season is the one it is given in Notion, which wins over the dates: a program can spill
	// into September and still belong to the season before. What is in no program goes by its date.
	const seasonAt = (date: string) => programOf(programs, date)?.season ?? seasonOf(date);

	// Newest first: each season, followed by its programs
	const seasons = [...new Set([seasonAt(today), ...programs.map((p) => p.season)])].sort().reverse();
	const periods = seasons.flatMap((season): Period[] => {
		const own = programs.filter((p) => p.season === season);
		const year = seasonRange(season);
		return [
			{
				value: season,
				label: `Temporada ${season}`,
				from: earliest([...(year ? [year.from] : []), ...own.map((p) => p.start)]),
				to: latest([...(year ? [year.to] : []), ...own.map((p) => p.end)]),
				season
			},
			...own.reverse().map((p) => ({ value: p.id, label: programLabel(p), from: p.start, to: p.end }))
		];
	});

	// Without a choice: the program going on, else the last one to have started, else the season
	const started = programs.filter((p) => p.start <= today);
	const current = started.find((p) => today <= p.end) ?? started.at(-1);
	const period =
		periods.find((p) => p.value === url.searchParams.get('p')) ??
		periods.find((p) => p.value === (current?.id ?? seasonAt(today)))!;

	const { events, records, members } = await getSeason(period.from);
	const inPeriod = (start: string) => {
		const date = start.slice(0, 10);
		return period.from <= date && date <= period.to && (!period.season || seasonAt(date) === period.season);
	};
	// The grid has a column per recorded event
	const columns = events
		.filter((event) => inPeriod(event.start) && records.has(event.key))
		.map((event) => ({ key: event.key, title: event.title, start: event.start, allDay: event.allDay }));
	const recorded = columns.map((column) => records.get(column.key)!);

	const rows = new Map(
		members.map((member) => {
			const cells = recorded.map((record) => stateIn(record, member.id));
			return [member.id, { cells, ...summarise(cells) }];
		})
	);

	// A period lists whoever took part in it. One that is still going on also lists the current members
	// who haven't been to anything yet.
	const ongoing = inPeriod(today);
	const listed = members.filter(
		(m) => (ongoing && m.status !== 'inactive') || rows.get(m.id)!.cells.some((cell) => cell !== 'notCalled')
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
