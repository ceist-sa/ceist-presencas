import { getSeason } from '$lib/server/season';
import { usingSampleData } from '$lib/server/store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { events, records, members, today } = await getSeason();
	// Members who only come when called up are left out of the count, as in the checklist
	const onCall = new Set(members.filter((m) => m.status === 'onCall').map((m) => m.id));
	const items = events.map((event) => {
		const record = records.get(event.key);
		return {
			...event,
			/** How many regular members came, late or not, or null if attendance hasn't been recorded */
			present: record ? [...record.present, ...record.late].filter((id) => !onCall.has(id)).length : null
		};
	});

	return {
		today,
		upcoming: items.filter((r) => r.start.slice(0, 10) >= today).slice(0, 4),
		past: items.filter((r) => r.start.slice(0, 10) < today).reverse(),
		sampleData: usingSampleData()
	};
};
