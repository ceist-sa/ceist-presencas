import type { Member } from './types';

/** Score order. Sections not listed here go last, alphabetically. */
const ORDER = [
	'Maestro',
	'Violino',
	'Viola',
	'Violoncelo',
	'Contrabaixo',
	'Flauta',
	'Oboé',
	'Clarinete',
	'Fagote',
	'Percussão',
	'Teclado'
];

function rank(section: string): number {
	const index = ORDER.indexOf(section);
	return index === -1 ? ORDER.length : index;
}

export interface Group {
	section: string;
	/** The group of members who only come when called up, instead of an instrument section */
	onCall: boolean;
	members: Member[];
}

const byName = (a: Member, b: Member) => a.name.localeCompare(b.name, 'pt');

/**
 * Groups members by instrument section in score order, each sorted by name. Members who are
 * "Ativo por convocação" don't rehearse regularly, so they go in a group of their own at the end.
 */
export function bySection(members: Member[]): Group[] {
	const sections = new Map<string, Member[]>();
	for (const member of members.filter((m) => m.status !== 'onCall')) {
		sections.set(member.section, [...(sections.get(member.section) ?? []), member]);
	}
	const groups = [...sections.entries()]
		.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'pt'))
		.map(([section, list]): Group => ({ section, onCall: false, members: list.sort(byName) }));

	const onCall = members.filter((m) => m.status === 'onCall').sort(byName);
	if (onCall.length) {
		groups.push({ section: 'Por convocação', onCall: true, members: onCall });
	}
	return groups;
}
