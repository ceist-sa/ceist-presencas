import { error } from '@sveltejs/kit';
import { getSeason } from '$lib/server/season';
import { getPrograms } from '$lib/server/store';
import { programLabel, programOf, seasonOf } from '$lib/programs';
import { stateIn, summarise } from '$lib/stats';
import type { MemberState } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Everything ever recorded: attendance is always inside a program or in the current season
	const firstProgram = (await getPrograms()).map((program) => program.start).sort()[0];
	const { events, records, members, programs } = await getSeason(firstProgram);
	const member = members.find((m) => m.id === params.id);
	if (!member) {
		error(404, 'Membro não encontrado');
	}

	// Every recorded event, with the member's state in it and the program and season it belongs to
	const history = events
		.filter((event) => records.has(event.key))
		.map((event) => {
			const program = programOf(programs, event.start);
			return {
				key: event.key,
				title: event.title,
				start: event.start,
				allDay: event.allDay,
				state: stateIn(records.get(event.key)!, member.id),
				// As in the statistics: the program's season wins over the date
				season: program?.season ?? seasonOf(event.start),
				group: program ? program.id : `none:${seasonOf(event.start)}`,
				label: program ? programLabel(program) : 'Sem programa',
				/** The label without the season, for where the season is already given */
				name: program ? program.name : 'Sem programa'
			};
		});

	const states = (list: { state: MemberState }[]) => list.map((event) => event.state);
	const took = (list: { state: MemberState }[]) => list.some((event) => event.state !== 'notCalled');

	// Newest first: seasons, and within each its programs. Only the ones the member was called to.
	const seasons = [...new Set(history.map((event) => event.season))]
		.sort()
		.reverse()
		.map((season) => {
			const inSeason = history.filter((event) => event.season === season);
			const groups = [...new Set(inSeason.map((event) => event.group))]
				.map((group) => inSeason.filter((event) => event.group === group))
				.filter(took)
				.sort((a, b) => b[0].start.localeCompare(a[0].start))
				.map((list) => ({
					label: list[0].label,
					name: list[0].name,
					...summarise(states(list)),
					// The program's whole run, so that the events the member wasn't called to show as gaps
					events: list.map(({ key, title, start, allDay, state }) => ({ key, title, start, allDay, state }))
				}));
			return { season, ...summarise(states(inSeason)), groups };
		})
		.filter((season) => season.groups.length > 0);

	return {
		member: { name: member.name, section: member.section, status: member.status },
		total: summarise(states(history)),
		seasons
	};
};
