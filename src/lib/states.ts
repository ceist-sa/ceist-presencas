import type { MemberState } from './types';

/** How each state is shown in the grids: a letter on a colour, and its name */
export const STATE_CELL: Record<MemberState, { letter: string; colour: string; title: string }> = {
	present: { letter: 'P', colour: 'bg-present', title: 'Presença' },
	late: { letter: '½', colour: 'bg-late', title: 'Meia presença' },
	justified: { letter: 'J', colour: 'bg-justified', title: 'Falta justificada' },
	absent: { letter: 'F', colour: 'bg-absent', title: 'Falta injustificada' },
	notCalled: { letter: '·', colour: 'opacity-40', title: 'Não convocado' }
};

/** The order of the legends */
export const STATE_LEGEND: MemberState[] = ['present', 'late', 'justified', 'absent', 'notCalled'];
