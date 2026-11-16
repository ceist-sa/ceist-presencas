import { getSeason } from '$lib/server/season';
import { bySection } from '$lib/sections';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { records, members } = await getSeason();
	const recorded = [...records.values()];

	const stats = new Map(
		members.map((member) => {
			const present = recorded.filter((r) => r.present.includes(member.id)).length;
			const late = recorded.filter((r) => r.late.includes(member.id)).length;
			const absent = recorded.filter((r) => r.absent.includes(member.id)).length;
			const justified = recorded.filter((r) => r.justified.includes(member.id)).length;
			// Events where the member is in no list don't count: they weren't expected at those
			const expected = present + late + absent;
			return [
				member.id,
				{
					present,
					late,
					justified,
					absent,
					/** Share of the events without a justified absence that the member came to, late or not, in percent */
					rate: expected > 0 ? Math.round(((present + late) / expected) * 100) : null
				}
			];
		})
	);

	return {
		events: recorded.length,
		sections: bySection(members.filter((m) => m.status !== 'inactive')).map(({ section, onCall, members }) => ({
			section,
			onCall,
			members: members.map((member) => ({ ...member, ...stats.get(member.id)! }))
		}))
	};
};
