import type { AttendanceRecord, Member, CalendarEvent, Program } from '$lib/types';
import { getEvents, lisbonNow, seasonStart } from './calendar';
import { getAttendance, getMembers, getPrograms } from './store';

export interface Season {
	/** Events since the start of the period, oldest first */
	events: CalendarEvent[];
	/** Attendance already recorded in the period, by event key */
	records: Map<string, AttendanceRecord>;
	members: Member[];
	/** Every program, oldest first */
	programs: Program[];
	/** Today's date in Lisbon, `YYYY-MM-DD` */
	today: string;
}

/**
 * Everything the pages need: the calendar's events joined with what is recorded in Notion. Covers the
 * current season, or goes further back when given an earlier date (`YYYY-MM-DD`).
 */
export async function getSeason(from?: string): Promise<Season> {
	const now = lisbonNow();
	const season = seasonStart(now);
	const since = from && `${from}T00:00` < season ? `${from}T00:00` : season;
	const [fromCalendar, attendance, members, programs] = await Promise.all([
		getEvents(since),
		getAttendance(since),
		getMembers(),
		getPrograms()
	]);

	const records = new Map(attendance.map((r) => [r.key, r]));

	// A recorded event that was later moved or removed in the calendar is still listed
	const inCalendar = new Set(fromCalendar.map((r) => r.key));
	const orphans = [...records.values()]
		.filter((r) => !inCalendar.has(r.key))
		.map((r): CalendarEvent => ({ key: r.key, title: r.title, start: r.start, end: null, allDay: false, location: '' }));

	return {
		events: [...fromCalendar, ...orphans].sort((a, b) => a.start.localeCompare(b.start)),
		records,
		members,
		programs,
		today: now.slice(0, 10)
	};
}
