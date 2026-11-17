// Stand-in for Notion during development, so the site runs without a token: sample members and
// attendance kept in data/attendance.json.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AttendanceRecord, Member, Program } from '$lib/types';

const FILE = join(process.cwd(), 'data', 'attendance.json');

const SAMPLE: [string, string, Member['status']][] = [
	['Maestro de Teste', 'Maestro', 'active'],
	['Ana Exemplo', 'Violino', 'active'],
	['Bruno Exemplo', 'Violino', 'active'],
	['Carla Exemplo', 'Violino', 'active'],
	['Duarte Exemplo', 'Viola', 'active'],
	['Eva Exemplo', 'Violoncelo', 'active'],
	['Filipe Exemplo', 'Violoncelo', 'onCall'],
	['Joana Exemplo', 'Oboé', 'onCall'],
	['Gabriela Exemplo', 'Flauta', 'active'],
	['Hugo Exemplo', 'Clarinete', 'active'],
	['Inês Exemplo', 'Contrabaixo', 'inactive']
];

export async function getMembers(): Promise<Member[]> {
	return SAMPLE.map(([name, section, status], index) => ({ id: `sample-${index + 1}`, name, section, status }));
}

/** Two seasons with a program of the same name, as happens with the real ones */
export async function getPrograms(): Promise<Program[]> {
	return [
		{ id: 'program-1', name: 'Natal', season: '2025-2026', start: '2025-11-01', end: '2025-12-20' },
		{ id: 'program-2', name: 'Outono', season: '2026-2027', start: '2026-09-14', end: '2026-11-08' },
		{ id: 'program-3', name: 'Natal', season: '2026-2027', start: '2026-11-09', end: '2026-12-20' }
	];
}

function readAll(): AttendanceRecord[] {
	return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf-8')) : [];
}

export async function getAttendance(since: string): Promise<AttendanceRecord[]> {
	return readAll().filter((record) => record.start >= since);
}

export async function saveAttendance(record: AttendanceRecord, _program?: string): Promise<void> {
	const records = readAll().filter((r) => r.key !== record.key);
	writeFileSync(FILE, JSON.stringify([...records, record], null, 4), 'utf-8');
}
