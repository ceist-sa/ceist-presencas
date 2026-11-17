/** An event from the iCal feed. Times are Lisbon wall-clock, formatted `YYYY-MM-DDTHH:MM`. */
export interface CalendarEvent {
	/** Identifies the event in URLs and in Notion: its start time without the colon, e.g. `2026-11-16T1830` */
	key: string;
	title: string;
	start: string;
	end: string | null;
	allDay: boolean;
	location: string;
}

export interface Member {
	/** Notion page id in "Dados dos Membros" */
	id: string;
	name: string;
	/** Instrument section, e.g. "Violino" */
	section: string;
	status: 'active' | 'onCall' | 'inactive';
	/** Link to a picture of the member, shown on the cards */
	photo?: string;
}

/** A block of rehearsals and concerts within a season, from the "Programas" database in Notion. */
export interface Program {
	/** Notion page id */
	id: string;
	name: string;
	/** e.g. "2026/27". Programs of different seasons can share a name. */
	season: string;
	/** First and last day, `YYYY-MM-DD` */
	start: string;
	end: string;
}

/**
 * Who was at an event. A member is in at most one list. Those in none weren't expected: members who
 * only come when called up and weren't, or members who joined after the event was recorded.
 * In Notion this is one row per member, with the list as the row's state.
 */
export interface AttendanceRecord {
	key: string;
	title: string;
	start: string;
	/** Arrived on time */
	present: string[];
	/** Half a presence ("meia presença"): came, but arrived late or left early. Counts as half in the statistics. */
	late: string[];
	/** Absent without a justification */
	absent: string[];
	/** Absent with a justification */
	justified: string[];
}

/** The states an attendance record holds, in the order they are listed */
export const RECORDED_STATES = ['present', 'late', 'absent', 'justified'] as const;

/** A member's state at one event. `notCalled` means they weren't expected, and nothing is recorded for them. */
export type MemberState = (typeof RECORDED_STATES)[number] | 'notCalled';

/**
 * The state of a member nobody has marked yet. Regular members are expected at every event, so they count
 * as absent; members who only come when called up count as not called.
 */
export function defaultState(member: { status?: Member['status']; onCall?: boolean }): MemberState {
	return member.onCall || member.status === 'onCall' ? 'notCalled' : 'absent';
}
