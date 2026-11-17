import type { Program } from './types';

/** The season a date falls in, e.g. "2026/27". Seasons run from 1 September to 31 August. */
export function seasonOf(date: string): string {
	const year = Number(date.slice(0, 4)) - (date.slice(5, 7) < '09' ? 1 : 0);
	return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
}

/** First and last day of a season written as by `seasonOf`. */
export function seasonRange(season: string): { from: string; to: string } {
	const year = Number(season.slice(0, 4));
	return { from: `${year}-09-01`, to: `${year + 1}-08-31` };
}

/** Programs repeat from year to year ("Natal"), so they are always shown with their season. */
export function programLabel(program: Program): string {
	return `${program.name} ${program.season}`;
}

/**
 * The program an event belongs to: the one whose dates include the event's. Should two overlap, the one
 * that started last wins.
 */
export function programOf(programs: Program[], start: string): Program | undefined {
	const date = start.slice(0, 10);
	return programs
		.filter((program) => program.start <= date && date <= program.end)
		.sort((a, b) => b.start.localeCompare(a.start))[0];
}
