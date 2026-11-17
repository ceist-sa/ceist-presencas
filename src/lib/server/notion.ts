import { env } from '$env/dynamic/private';
import { seasonOf, seasonRange } from '$lib/programs';
import type { AttendanceRecord, Member, Program } from '$lib/types';

// Notion's REST API, called directly. This version addresses databases by their database id.
const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

/** Property names in "Dados dos Membros" */
const MEMBER = {
	fullName: 'Nome completo',
	programName: 'Nome de programa',
	instrument: 'Instrumento',
	status: 'Estado',
	/** Optional: a files property with a picture of the member */
	photo: 'Fotografia',
	/** The member's Notion account, whose avatar is used when there is no picture */
	person: 'Person'
};

/**
 * Property names in the attendance database, which has one row per member per event.
 * scripts/setup-notion.ts creates it with the same names.
 */
const ATTENDANCE = {
	title: 'Registo',
	member: 'Membro',
	state: 'Estado',
	event: 'Evento',
	date: 'Data',
	key: 'Chave',
	/** Relation to the program the event is in, so that rows can be filtered by program in Notion */
	program: 'Programa'
};

/** Property names in the "Programas" database. scripts/setup-notion.ts adds them with the same names. */
const PROGRAM = {
	name: 'Nome',
	/** e.g. "2026/27". Worked out from the start date when left empty. */
	season: 'Temporada',
	start: 'Início',
	end: 'Fim'
};

const MEMBERS_CACHE_MS = 5 * 60 * 1000;
const ATTENDANCE_CACHE_MS = 5 * 60 * 1000;

// Notion's responses are read loosely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function notion(path: string, init: { method?: string; body?: unknown } = {}): Promise<Json> {
	for (let attempt = 0; ; attempt++) {
		const response = await fetch(`${API}${path}`, {
			method: init.method ?? 'GET',
			headers: {
				Authorization: `Bearer ${env.NOTION_TOKEN}`,
				'Notion-Version': VERSION,
				'Content-Type': 'application/json'
			},
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
			signal: AbortSignal.timeout(20_000)
		});

		// Notion allows about three requests per second and says how long to wait when that is exceeded
		if (response.status === 429 && attempt < 3) {
			const seconds = Number(response.headers.get('Retry-After')) || 1;
			await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
			continue;
		}
		if (!response.ok) {
			throw new Error(`Notion ${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`);
		}
		return response.json();
	}
}

async function queryAll(databaseId: string, body: Record<string, unknown> = {}): Promise<Json[]> {
	const pages: Json[] = [];
	let cursor: string | undefined;
	do {
		const result = await notion(`/databases/${databaseId}/query`, {
			method: 'POST',
			body: { ...body, page_size: 100, start_cursor: cursor }
		});
		pages.push(...result.results);
		cursor = result.has_more ? result.next_cursor : undefined;
	} while (cursor);
	return pages;
}

function plainText(property: Json): string {
	const parts = property?.title ?? property?.rich_text ?? [];
	return parts.map((part: Json) => part.plain_text).join('').trim();
}

function required(name: 'NOTION_MEMBERS_DB' | 'NOTION_ATTENDANCE_DB'): string {
	const value = env[name];
	if (!value) {
		throw new Error(`${name} is not configured`);
	}
	return value;
}

/** Links to files stored in Notion expire after an hour; the members cache is refreshed well within that. */
function photoUrl(properties: Json): string | undefined {
	const file = properties[MEMBER.photo]?.files?.[0];
	return file?.file?.url ?? file?.external?.url ?? properties[MEMBER.person]?.people?.[0]?.avatar_url ?? undefined;
}

let membersCache: { at: number; members: Member[] } | undefined;

/**
 * Every member in "Dados dos Membros", inactive ones included so that old attendance records still show
 * their names. Only the name, instrument and status leave this function; the rest of the row is personal data.
 */
export async function getMembers(): Promise<Member[]> {
	if (membersCache && Date.now() - membersCache.at < MEMBERS_CACHE_MS) {
		return membersCache.members;
	}

	const pages = await queryAll(required('NOTION_MEMBERS_DB'));
	const members = pages.map((page): Member => {
		const properties = page.properties;
		const status = properties[MEMBER.status]?.select?.name;
		return {
			id: page.id,
			name: plainText(properties[MEMBER.programName]) || plainText(properties[MEMBER.fullName]) || 'Sem nome',
			// Options are bilingual, e.g. "Violino (Violin)"
			section: (properties[MEMBER.instrument]?.select?.name ?? 'Outro').replace(/\s*\(.*\)$/, ''),
			status: status === 'Inativo' ? 'inactive' : status === 'Ativo por convocação' ? 'onCall' : 'active',
			photo: photoUrl(properties)
		};
	});

	membersCache = { at: Date.now(), members };
	return members;
}

let programsCache: { at: number; programs: Program[] } | undefined;

/** Every program with a start date, oldest first. None if there is no programs database. */
export async function getPrograms(): Promise<Program[]> {
	if (!env.NOTION_PROGRAMS_DB) {
		return [];
	}
	if (programsCache && Date.now() - programsCache.at < MEMBERS_CACHE_MS) {
		return programsCache.programs;
	}

	const programs = (await queryAll(env.NOTION_PROGRAMS_DB))
		.map((page): Program | undefined => {
			const properties = page.properties;
			const start: string | undefined = properties[PROGRAM.start]?.date?.start?.slice(0, 10);
			if (!start) return undefined;
			const season = properties[PROGRAM.season];
			return {
				id: page.id,
				name: plainText(properties[PROGRAM.name]) || 'Programa',
				season: season?.select?.name ?? (plainText(season) || seasonOf(start)),
				start,
				// A program with no end date yet runs until the end of its season
				end: properties[PROGRAM.end]?.date?.start?.slice(0, 10) ?? seasonRange(seasonOf(start)).to
			};
		})
		.filter((program) => program !== undefined)
		.sort((a, b) => a.start.localeCompare(b.start));

	programsCache = { at: Date.now(), programs };
	return programs;
}

const STATES = ['present', 'late', 'absent', 'justified'] as const;
type State = (typeof STATES)[number];

/** Options of the "Estado" select. scripts/setup-notion.ts creates them with the same names. */
const STATE_NAMES: Record<State, string> = {
	present: 'Presença',
	late: 'Meia presença',
	justified: 'Falta justificada',
	absent: 'Falta injustificada'
};

function stateOf(page: Json): State | undefined {
	const name = page.properties[ATTENDANCE.state]?.select?.name;
	// Rows from when a half presence was called a late arrival
	if (name === 'Atraso') return 'late';
	return STATES.find((state) => STATE_NAMES[state] === name);
}

function memberOf(page: Json): string | undefined {
	return page.properties[ATTENDANCE.member]?.relation?.[0]?.id;
}

/** Runs the tasks a few at a time, to stay close to the rate Notion allows. */
async function inParallel(tasks: (() => Promise<unknown>)[], workers = 3): Promise<void> {
	const queue = [...tasks];
	await Promise.all(
		Array.from({ length: workers }, async () => {
			for (let task = queue.shift(); task; task = queue.shift()) {
				await task();
			}
		})
	);
}

// A season is a few hundred to a couple of thousand rows, fetched 100 at a time, so it is kept for a
// while. Saving through the site updates the copy; edits made directly in Notion show up when it expires.
let attendanceCache: { at: number; since: string; records: Map<string, AttendanceRecord> } | undefined;

/** Every event recorded since the given time, rebuilt from the one-row-per-member-per-event table. */
export async function getAttendance(since: string): Promise<AttendanceRecord[]> {
	// A copy that goes further back than asked also has the answer
	if (attendanceCache && attendanceCache.since <= since && Date.now() - attendanceCache.at < ATTENDANCE_CACHE_MS) {
		return [...attendanceCache.records.values()].filter((record) => record.start >= since);
	}

	const pages = await queryAll(required('NOTION_ATTENDANCE_DB'), {
		filter: { property: ATTENDANCE.date, date: { on_or_after: since.slice(0, 10) } }
	});

	const records = new Map<string, AttendanceRecord>();
	const seen = new Set<string>();
	for (const page of pages) {
		const key = plainText(page.properties[ATTENDANCE.key]);
		const member = memberOf(page);
		const state = stateOf(page);
		// Rows without a key, member or state were added or emptied by hand and can't be used. Should a
		// member have two rows for one event, the first wins; saving the event removes the other.
		if (!key || !member || !state || seen.has(`${key}/${member}`)) continue;
		seen.add(`${key}/${member}`);

		let record = records.get(key);
		if (!record) {
			record = {
				key,
				title: plainText(page.properties[ATTENDANCE.event]),
				// The key is the start time without its colon
				start: `${key.slice(0, 13)}:${key.slice(13)}`,
				present: [],
				late: [],
				absent: [],
				justified: []
			};
			records.set(key, record);
		}
		record[state].push(member);
	}

	attendanceCache = { at: Date.now(), since, records };
	return [...records.values()];
}

/**
 * Brings the rows of an event in line with the record: one row per member who was expected, each linked
 * to the event's program (a Notion page id) when there is a programs database.
 */
export async function saveAttendance(record: AttendanceRecord, program?: string): Promise<void> {
	const databaseId = required('NOTION_ATTENDANCE_DB');
	const programRelation = env.NOTION_PROGRAMS_DB
		? { [ATTENDANCE.program]: { relation: program ? [{ id: program }] : [] } }
		: {};
	const names = new Map((await getMembers()).map((member) => [member.id, member.name]));

	const wanted = new Map<string, State>();
	for (const state of STATES) {
		for (const member of record[state]) wanted.set(member, state);
	}

	const existing = await queryAll(databaseId, {
		filter: { property: ATTENDANCE.key, rich_text: { equals: record.key } }
	});

	const tasks: (() => Promise<unknown>)[] = [];
	const kept = new Set<string>();
	for (const page of existing) {
		const member = memberOf(page);
		const state = member && wanted.get(member);
		if (!member || !state || kept.has(member)) {
			// The member is no longer expected at this event, or the row is a duplicate
			tasks.push(() => notion(`/pages/${page.id}`, { method: 'PATCH', body: { archived: true } }));
			continue;
		}
		kept.add(member);
		// The program is brought up to date too, in case the program's dates changed since the last save
		const programChanged =
			!!env.NOTION_PROGRAMS_DB && page.properties[ATTENDANCE.program]?.relation?.[0]?.id !== program;
		if (stateOf(page) !== state || programChanged) {
			const properties = { [ATTENDANCE.state]: { select: { name: STATE_NAMES[state] } }, ...programRelation };
			tasks.push(() => notion(`/pages/${page.id}`, { method: 'PATCH', body: { properties } }));
		}
	}

	const [year, month, day] = record.start.slice(0, 10).split('-');
	const text = (content: string) => [{ text: { content } }];
	for (const [member, state] of wanted) {
		if (kept.has(member)) continue;
		const properties = {
			[ATTENDANCE.title]: { title: text(`${names.get(member) ?? 'Membro'} · ${day}/${month}/${year}`) },
			[ATTENDANCE.member]: { relation: [{ id: member }] },
			[ATTENDANCE.state]: { select: { name: STATE_NAMES[state] } },
			[ATTENDANCE.event]: { rich_text: text(record.title) },
			[ATTENDANCE.date]: { date: { start: `${record.start}:00`, time_zone: 'Europe/Lisbon' } },
			[ATTENDANCE.key]: { rich_text: text(record.key) },
			...programRelation
		};
		tasks.push(() => notion('/pages', { method: 'POST', body: { parent: { database_id: databaseId }, properties } }));
	}

	try {
		await inParallel(tasks);
	} catch (error) {
		// Some rows may have been written; the cached copy no longer matches Notion
		attendanceCache = undefined;
		throw error;
	}
	if (attendanceCache && record.start >= attendanceCache.since) {
		attendanceCache.records.set(record.key, record);
	}
}
