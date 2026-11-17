import ICAL from 'ical.js';
import { env } from '$env/dynamic/private';
import type { CalendarEvent } from '$lib/types';

const CACHE_MS = 5 * 60 * 1000;
/** The whole feed is parsed and kept, so that programs of earlier seasons can be looked at */
const EVERYTHING = '2000-01-01T00:00';
/** How far ahead events are listed */
const DAYS_AHEAD = 60;

let cache: { at: number; events: CalendarEvent[] } | undefined;

function lisbon(date: Date): string {
	// sv-SE formats as "YYYY-MM-DD HH:MM"
	return new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Europe/Lisbon',
		dateStyle: 'short',
		timeStyle: 'short'
	})
		.format(date)
		.replace(' ', 'T');
}

/** The current Lisbon time as `YYYY-MM-DDTHH:MM`. */
export function lisbonNow(): string {
	return lisbon(new Date());
}

/** The season runs from 1 September to 31 August. Returns the start of the current one. */
export function seasonStart(now = lisbonNow()): string {
	const year = Number(now.slice(0, 4));
	const start = `${year}-09-01T00:00`;
	return now >= start ? start : `${year - 1}-09-01T00:00`;
}

/**
 * Wall-clock time of an event. The feed's times carry the calendar's own timezone (Lisbon), so their
 * fields are used as they are; only times given in UTC need converting.
 */
function wallClock(time: ICAL.Time): string {
	if (!time.isDate && time.zone?.tzid === 'UTC') {
		return lisbon(time.toJSDate());
	}
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${time.year}-${pad(time.month)}-${pad(time.day)}T${pad(time.hour)}:${pad(time.minute)}`;
}

/** Text that, in an event's title or description, keeps it out of the site */
const NO_ATTENDANCE = /sem presen[çc]as/i;

/** The event as the site lists it, or undefined if the calendar says it has no attendance. */
function toCalendarEvent(source: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null): CalendarEvent | undefined {
	if (NO_ATTENDANCE.test(`${source.summary ?? ''} ${source.description ?? ''}`)) {
		return undefined;
	}
	const startText = wallClock(start);
	return {
		key: startText.replace(':', ''),
		title: (source.summary ?? '').trim() || 'Evento',
		start: startText,
		end: end ? wallClock(end) : null,
		allDay: start.isDate,
		location: (source.location ?? '').trim()
	};
}

/** Every event in the feed between `from` and `to`, with recurring events expanded. */
export function parseCalendar(text: string, from: string, to: string): CalendarEvent[] {
	const calendar = new ICAL.Component(ICAL.parse(text));

	// A recurring event comes as one VEVENT with the rule plus one VEVENT per modified occurrence, sharing a UID
	const byUid = new Map<string, ICAL.Component[]>();
	for (const vevent of calendar.getAllSubcomponents('vevent')) {
		const uid = String(vevent.getFirstPropertyValue('uid'));
		byUid.set(uid, [...(byUid.get(uid) ?? []), vevent]);
	}

	const events: CalendarEvent[] = [];
	const add = (event: CalendarEvent | undefined) => event && events.push(event);
	for (const vevents of byUid.values()) {
		const main = vevents.find((v) => !v.hasProperty('recurrence-id'));
		if (!main) {
			// Modified occurrences whose series is outside the published range
			for (const vevent of vevents) {
				const single = new ICAL.Event(vevent);
				add(toCalendarEvent(single, single.startDate, single.endDate));
			}
			continue;
		}

		const series = new ICAL.Event(main, {
			exceptions: vevents.filter((v) => v !== main),
			strictExceptions: false
		});
		if (!series.isRecurring()) {
			add(toCalendarEvent(series, series.startDate, series.endDate));
			continue;
		}

		const iterator = series.iterator();
		// The limit guards against a rule with no end
		for (let i = 0; i < 5000; i++) {
			const next = iterator.next();
			if (!next || wallClock(next) > to) break;
			const occurrence = series.getOccurrenceDetails(next);
			add(toCalendarEvent(occurrence.item, occurrence.startDate, occurrence.endDate));
		}
	}

	const seen = new Set<string>();
	return events
		.filter((r) => r.start >= from && r.start <= to)
		.sort((a, b) => a.start.localeCompare(b.start))
		.filter((r) => !seen.has(r.key) && seen.add(r.key));
}

/**
 * The feed's events from the given time (by default the start of this season) up to a couple of months
 * ahead, oldest first. Every event
 * can have attendance (rehearsals, concerts, anything else) unless it is explicitly left out, either by
 * writing "sem presenças" in its title or description or through ICAL_EXCLUDE.
 */
export async function getEvents(from = seasonStart()): Promise<CalendarEvent[]> {
	const since = (events: CalendarEvent[]) => events.filter((event) => event.start >= from);
	if (cache && Date.now() - cache.at < CACHE_MS) {
		return since(cache.events);
	}
	if (!env.ICAL_URL) {
		throw new Error('ICAL_URL is not configured');
	}

	try {
		const response = await fetch(env.ICAL_URL, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) {
			throw new Error(`The calendar feed answered ${response.status}`);
		}
		const horizon = lisbon(new Date(Date.now() + DAYS_AHEAD * 24 * 60 * 60 * 1000));
		const exclude = env.ICAL_EXCLUDE ? new RegExp(env.ICAL_EXCLUDE, 'i') : undefined;
		const events = parseCalendar(await response.text(), EVERYTHING, horizon).filter(
			(r) => !exclude?.test(r.title)
		);
		cache = { at: Date.now(), events };
		return since(events);
	} catch (error) {
		// A stale list is better than none while the calendar is unreachable
		if (cache) {
			console.error('Could not refresh the calendar feed:', error);
			return since(cache.events);
		}
		throw error;
	}
}
