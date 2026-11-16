import { error, fail } from '@sveltejs/kit';
import { getSeason } from '$lib/server/season';
import { saveAttendance } from '$lib/server/store';
import { bySection } from '$lib/sections';
import { defaultState, RECORDED_STATES, type AttendanceRecord, type MemberState } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { events, records, members } = await getSeason();
	const event = events.find((r) => r.key === params.key);
	if (!event) {
		error(404, 'Evento não encontrado');
	}

	const record = records.get(event.key);
	const recorded = new Map<string, MemberState>();
	for (const state of RECORDED_STATES) {
		for (const id of record?.[state] ?? []) recorded.set(id, state);
	}

	// Inactive members only appear if they were marked at this event before becoming inactive
	const listed = members.filter((m) => m.status !== 'inactive' || recorded.has(m.id));

	// Once an event is recorded, a member with no state in it wasn't called. Before that, everyone starts
	// from their default.
	const states: Record<string, MemberState> = {};
	for (const member of listed) {
		states[member.id] = recorded.get(member.id) ?? (record ? 'notCalled' : defaultState(member));
	}

	return { event, sections: bySection(listed), states, recorded: !!record };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { events, members } = await getSeason();
		const event = events.find((r) => r.key === params.key);
		if (!event) {
			error(404, 'Evento não encontrado');
		}

		const record: AttendanceRecord = {
			key: event.key,
			title: event.title,
			start: event.start,
			present: [],
			late: [],
			absent: [],
			justified: []
		};

		// One "member id:state" field per member. Members with no field, or marked as not called, get no record.
		const known = new Set(members.map((m) => m.id));
		const seen = new Set<string>();
		for (const field of (await request.formData()).getAll('state').map(String)) {
			const separator = field.lastIndexOf(':');
			const id = field.slice(0, separator);
			const state = RECORDED_STATES.find((s) => s === field.slice(separator + 1));
			if (state && known.has(id) && !seen.has(id)) {
				seen.add(id);
				record[state].push(id);
			}
		}

		try {
			await saveAttendance(record);
		} catch (e) {
			console.error('Could not save attendance:', e);
			return fail(502, { failed: true });
		}
		return { saved: true };
	}
};
