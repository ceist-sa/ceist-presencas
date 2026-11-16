// Stand-in for Notion during development, so the site runs without a token: sample members and
// attendance kept in data/attendance.json.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AttendanceRecord, Member } from '$lib/types';

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

function readAll(): AttendanceRecord[] {
	return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf-8')) : [];
}

export async function getAttendance(since: string): Promise<AttendanceRecord[]> {
	return readAll().filter((record) => record.start >= since);
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
	const records = readAll().filter((r) => r.key !== record.key);
	writeFileSync(FILE, JSON.stringify([...records, record], null, 4), 'utf-8');
}
