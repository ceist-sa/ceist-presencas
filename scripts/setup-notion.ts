// Prepares the Notion databases the site writes to and reads programs from:
//
//   bun run setup-notion <attendance database or page URL> [programs database URL]
//
// The attendance database gets the columns the site needs; given a page instead, the database is created
// inside it. The optional programs database gets its columns too, and the attendance database a relation
// to it. Existing columns and rows are left alone, so it is safe to run again.
// Everything must be shared with the integration. Reads NOTION_TOKEN and NOTION_MEMBERS_DB from .env and
// prints the ids to add to it.
// The property names must match ATTENDANCE and PROGRAM in src/lib/server/notion.ts.

const { NOTION_TOKEN, NOTION_MEMBERS_DB } = process.env;
// A Notion URL ends in the 32-character id, before any query string
const idOf = (argument?: string) =>
	argument?.split('?')[0].match(/[0-9a-f]{32}$/i)?.[0] ?? argument?.replaceAll('-', '');
const isId = (id?: string): id is string => !!id && /^[0-9a-f]{32}$/i.test(id);

const target = idOf(process.argv[2]);
const programs = idOf(process.argv[3]);

if (!NOTION_TOKEN || !NOTION_MEMBERS_DB || !isId(target) || (process.argv[3] && !isId(programs))) {
	console.error(
		'Usage: bun run setup-notion <attendance database or page URL> [programs database URL], with NOTION_TOKEN and NOTION_MEMBERS_DB set in .env'
	);
	process.exit(1);
}

async function notion(method: string, path: string, body?: unknown): Promise<Response> {
	return fetch(`https://api.notion.com/v1${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${NOTION_TOKEN}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json'
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

async function ok(response: Response) {
	if (!response.ok) {
		console.error(`Notion answered ${response.status}: ${await response.text()}`);
		process.exit(1);
	}
	return response.json();
}

const relationTo = (database: string) => ({
	relation: { database_id: database, type: 'single_property', single_property: {} }
});

/** Renames the title column of an existing database and adds the columns it doesn't have yet. */
async function addColumns(database: string, title: string, columns: Record<string, unknown>) {
	const properties: Record<string, { type: string }> = (await ok(await notion('GET', `/databases/${database}`))).properties;
	const currentTitle = Object.keys(properties).find((name) => properties[name].type === 'title')!;
	const missing = Object.fromEntries(Object.entries(columns).filter(([name]) => !(name in properties)));
	return ok(
		await notion('PATCH', `/databases/${database}`, {
			properties: { ...missing, ...(currentTitle === title ? {} : { [currentTitle]: { name: title } }) }
		})
	);
}

if (isId(programs)) {
	const database = await addColumns(programs, 'Nome', {
		// e.g. "2026/27"; the site works it out from the start date when it is left empty
		Temporada: { select: {} },
		Início: { date: {} },
		Fim: { date: {} }
	});
	console.log(`Updated ${database.url}`);
}

// One row per member per event
const columns = {
	Membro: relationTo(NOTION_MEMBERS_DB),
	Estado: {
		select: {
			options: [
				{ name: 'Presença', color: 'green' },
				{ name: 'Meia presença', color: 'yellow' },
				{ name: 'Falta justificada', color: 'pink' },
				{ name: 'Falta injustificada', color: 'red' }
			]
		}
	},
	Evento: { rich_text: {} },
	Data: { date: {} },
	Chave: { rich_text: {} },
	...(isId(programs) ? { Programa: relationTo(programs) } : {})
};

const existing = await notion('GET', `/databases/${target}`);
const database = existing.ok
	? await addColumns(target, 'Registo', columns)
	: await ok(
			await notion('POST', '/databases', {
				parent: { type: 'page_id', page_id: target },
				title: [{ type: 'text', text: { content: 'Presenças nos Eventos' } }],
				properties: { Registo: { title: {} }, ...columns }
			})
		);

console.log(`${existing.ok ? 'Updated' : 'Created'} ${database.url}`);
console.log(`Add this to .env:\nNOTION_ATTENDANCE_DB=${database.id.replaceAll('-', '')}`);
if (isId(programs)) {
	console.log(`NOTION_PROGRAMS_DB=${programs}`);
}
