import type { AttendanceRecord, Member, CalendarEvent } from '$lib/types';
import { getEvents, lisbonNow, seasonStart } from './calendar';
import { getAttendance, getMembers } from './store';

export interface Season {
	/** Events of the current season, oldest first */
	events: CalendarEvent[];
	/** Attendance already recorded this season, by event key */
	records: Map<string, AttendanceRecord>;
	members: Member[];
	/** Today's date in Lisbon, `YYYY-MM-DD` */
	today: string;
}

/** Everything the pages need: the calendar's events joined with what is recorded in Notion. */
export async function getSeason(): Promise<Season> {
	const now = lisbonNow();
	const [fromCalendar, attendance, members] = await Promise.all([
		getEvents(),
		getAttendance(seasonStart(now)),
		getMembers()
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
		today: now.slice(0, 10)
	};
}
