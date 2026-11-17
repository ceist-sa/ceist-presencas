import { RECORDED_STATES, type AttendanceRecord, type MemberState } from './types';

/** A member's state at a recorded event: not called if they are in none of its lists. */
export function stateIn(record: AttendanceRecord, memberId: string): MemberState {
	return RECORDED_STATES.find((state) => record[state].includes(memberId)) ?? 'notCalled';
}

export interface Summary {
	present: number;
	late: number;
	justified: number;
	absent: number;
	/**
	 * Share of the events without a justified absence that the member came to, in percent. A half presence
	 * counts as half. Null when the member wasn't expected at anything.
	 */
	rate: number | null;
}

/** Counts a member's states over a set of events. Events they weren't called to don't count. */
export function summarise(states: MemberState[]): Summary {
	const count = (state: MemberState) => states.filter((s) => s === state).length;
	const [present, late, absent, justified] = RECORDED_STATES.map(count);
	const expected = present + late + absent;
	return {
		present,
		late,
		justified,
		absent,
		rate: expected > 0 ? Math.round(((present + late / 2) / expected) * 100) : null
	};
}
