// Event times are Lisbon wall-clock strings (`YYYY-MM-DDTHH:MM`), so they are formatted as if they were
// UTC to keep them from being shifted by the server's or the visitor's timezone.

function asDate(wallClock: string): Date {
	return new Date(`${wallClock.slice(0, 10)}T00:00:00Z`);
}

function format(wallClock: string, options: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', ...options }).format(asDate(wallClock));
}

/** "segunda-feira, 16 de novembro" */
export function longDate(wallClock: string): string {
	return format(wallClock, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "seg" */
export function weekday(wallClock: string): string {
	return format(wallClock, { weekday: 'short' }).replace('.', '');
}

/** "16" */
export function dayOfMonth(wallClock: string): string {
	return String(Number(wallClock.slice(8, 10)));
}

/** "nov" */
export function shortMonth(wallClock: string): string {
	return format(wallClock, { month: 'short' }).replace('.', '');
}

/** "18:30" */
export function time(wallClock: string): string {
	return wallClock.slice(11, 16);
}

/** "segunda-feira, 16 de novembro de 2026" */
export function fullDate(wallClock: string): string {
	return format(wallClock, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
