// Prepares the attendance database in Notion. Give it either an existing database, which gets the
// columns the site needs, or a page, inside which the database is created:
//
//   bun run setup-notion <database or page id or URL>
//
// Either one must be shared with the integration. Reads NOTION_TOKEN and NOTION_MEMBERS_DB from .env and
// prints the NOTION_ATTENDANCE_DB to add to it.
// The property names must match ATTENDANCE in src/lib/server/notion.ts.

const { NOTION_TOKEN, NOTION_MEMBERS_DB } = process.env;
// A Notion URL ends in the 32-character id, before any query string
const target = process.argv[2]?.split('?')[0].match(/[0-9a-f]{32}$/i)?.[0] ?? process.argv[2]?.replaceAll('-', '');

if (!NOTION_TOKEN || !NOTION_MEMBERS_DB || !target || !/^[0-9a-f]{32}$/i.test(target)) {
	console.error('Usage: bun run setup-notion <database or page id or URL>, with NOTION_TOKEN and NOTION_MEMBERS_DB set in .env');
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

// One row per member per event
const columns = {
	Membro: { relation: { database_id: NOTION_MEMBERS_DB, type: 'single_property', single_property: {} } },
	Estado: {
		select: {
			options: [
				{ name: 'Presença', color: 'green' },
				{ name: 'Atraso', color: 'yellow' },
				{ name: 'Falta justificada', color: 'pink' },
				{ name: 'Falta injustificada', color: 'red' }
			]
		}
	},
	Evento: { rich_text: {} },
	Data: { date: {} },
	Chave: { rich_text: {} }
};

const existing = await notion('GET', `/databases/${target}`);
let response: Response;
if (existing.ok) {
	// An existing database keeps its name and rows; its title column is renamed and the others are added
	const properties: Record<string, { type: string }> = (await existing.json()).properties;
	const title = Object.keys(properties).find((name) => properties[name].type === 'title')!;
	const missing = Object.fromEntries(Object.entries(columns).filter(([name]) => !(name in properties)));
	response = await notion('PATCH', `/databases/${target}`, {
		properties: { ...missing, ...(title === 'Registo' ? {} : { [title]: { name: 'Registo' } }) }
	});
} else {
	response = await notion('POST', '/databases', {
		parent: { type: 'page_id', page_id: target },
		title: [{ type: 'text', text: { content: 'Presenças nos Eventos' } }],
		properties: { Registo: { title: {} }, ...columns }
	});
}

if (!response.ok) {
	console.error(`Notion answered ${response.status}: ${await response.text()}`);
	process.exit(1);
}

const database = await response.json();
console.log(`${existing.ok ? 'Updated' : 'Created'} ${database.url}`);
console.log(`Add this to .env:\nNOTION_ATTENDANCE_DB=${database.id.replaceAll('-', '')}`);
