# CEIST Presenças

Internal site for recording who attends each rehearsal and concert of the
**Camerata de Estudantes do Instituto Superior Técnico (CEIST)**.

- The **events** come from the iCal feed of the "Ensaios e Concertos CEIST" calendar. Every event in it can have attendance:
  rehearsals, concerts and anything else. To leave one out, write "sem presenças" in its title or description in
  the calendar, or set `ICAL_EXCLUDE`.
- The **members** come from the "Dados dos Membros" database in the CEIST Notion.
- The **attendance** is stored in a Notion database, one row per member per event.

The Direção opens the site on a phone, enters a shared password, picks the event and ticks who came.
Each member ends up in one of four states: present, late, absent or absent with justification.
On a phone there is also a card mode, which shows one member at a time with a button per state; on-call
members only get a card when added with "Adicionar mais músicos".
Anyone can be marked as not called to an event (the winds at a strings-only rehearsal, say); they then get
no record for it and it doesn't count for them.
Members whose status is "Ativo por convocação" aren't expected at every event, so they are listed apart
and start as "not called"; when they are called they can be present, late or absent like anyone else, and only
those events count for them. The "Membros" page shows each member's attendance for the season
(1 September to 31 August).

## Tech stack

Same as the [website](https://github.com/ceist-sa/ceist-website): Svelte 5 with SvelteKit, Tailwind CSS 4, Bun,
Docker and Caddy.

## Local development

```bash
bun install
cp .env.example .env   # set APP_PASSWORD and ICAL_URL
bun run dev
```

With `NOTION_TOKEN` empty the site uses sample members and keeps attendance in `data/attendance.json`, so it runs
without access to Notion.

## Configuration

| Variable | Purpose |
| --- | --- |
| `APP_PASSWORD` | Password that opens the site |
| `ORIGIN` | Public URL of the site, needed in production for form submissions |
| `ICAL_URL` | iCal feed with the rehearsals and concerts |
| `ICAL_EXCLUDE` | Optional regular expression; events whose title matches it are left out |
| `NOTION_TOKEN` | Token of the Notion integration |
| `NOTION_MEMBERS_DB` | Id of the "Dados dos Membros" database |
| `NOTION_ATTENDANCE_DB` | Id of the attendance database |

## Connecting to Notion

1. Create an internal integration at <https://www.notion.so/profile/integrations> in the CEIST workspace, with
   read, update and insert content capabilities, and put its token in `NOTION_TOKEN`.
2. Share "Dados dos Membros" with the integration (database menu → Connections).
3. Create an empty database for the attendance (or choose a page to hold a new one), share it with the
   integration and run:
   ```bash
   bun run setup-notion <database or page URL>
   ```
   It adds the columns the site needs to the database (or creates "Presenças nos Eventos" in the page) and
   prints the `NOTION_ATTENDANCE_DB` to put in `.env`.

The cards show a picture of each member when there is one: the first file of a `Fotografia` files property in
"Dados dos Membros" if that property exists, otherwise the avatar of the Notion account in `Person`, otherwise
the member's initials.

The site reads only the name, instrument, status and picture of each member. The integration can nevertheless see the
whole "Dados dos Membros" database, so treat its token like a password.

### Attendance database

One row per member per event:

| Property | Type | Content |
| --- | --- | --- |
| `Registo` | Title | Member and date, such as "Ana Silva · 16/11/2026" |
| `Membro` | Relation to Dados dos Membros | The member |
| `Estado` | Select | `Presença`, `Atraso`, `Falta justificada` or `Falta injustificada` |
| `Evento` | Text | The event's title in the calendar |
| `Data` | Date | Start of the event |
| `Chave` | Text | Start time such as `2026-11-16T1830`. This is how the site matches a row to an event, so don't edit it |

A member with no row for an event wasn't called to it. `Estado` can
also be edited directly in Notion; the site picks the change up within five minutes.

Saving an event for the first time creates one row per member, which takes Notion several seconds. Later
saves only touch the rows that changed.

An event is identified by its start time. If an event that already has attendance is moved in the calendar,
its record stays listed under the old time.

## Project structure

- `src/lib/server/calendar.ts`: reads the iCal feed and expands recurring events.
- `src/lib/server/notion.ts`: members and attendance in Notion.
- `src/lib/server/local.ts`: the sample store used in development.
- `src/lib/server/auth.ts` and `src/hooks.server.ts`: the shared password.
- `src/routes/`: the event list (`/`), the checklist (`/eventos/[key]`) and the season summary (`/membros`).

## Deployment

On every push to `main`, GitHub Actions builds a Docker image and publishes it to
`ghcr.io/ceist-sa/ceist-presencas`. On the server:

```bash
docker compose up -d
```

`docker-compose.yaml` expects a `.env` next to it and the `caddy` network used by the other CEIST services.
