import { programLabel, programOf } from '$lib/programs';
import { getSeason } from '$lib/server/season';
import { usingSampleData } from '$lib/server/store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { events, records, members, programs, today } = await getSeason();
	// Members who only come when called up are left out of the count, as in the checklist
	const onCall = new Set(members.filter((m) => m.status === 'onCall').map((m) => m.id));
	const items = events.map((event) => {
		const program = programOf(programs, event.start);
		const record = records.get(event.key);
		return {
			...event,
			/** The program the event is in, with its season, or null if it is in none */
			program: program ? programLabel(program) : null,
			/** How many regular members came, late or not, or null if attendance hasn't been recorded */
			present: record ? [...record.present, ...record.late].filter((id) => !onCall.has(id)).length : null
		};
	});

	return {
		today,
		upcoming: items.filter((r) => r.start.slice(0, 10) >= today).slice(0, 4),
		past: items.filter((r) => r.start.slice(0, 10) < today).reverse(),
		hasPrograms: programs.length > 0,
		sampleData: usingSampleData()
	};
};
