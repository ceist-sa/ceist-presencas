import type { Handle } from '@sveltejs/kit';
import { isSignedIn, SESSION_COOKIE } from '$lib/server/auth';

// Everything except the login page needs the shared password
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (path !== '/login' && !isSignedIn(event.cookies.get(SESSION_COOKIE))) {
		const next = encodeURIComponent(path + event.url.search);
		return new Response(null, { status: 303, headers: { Location: `/login?next=${next}` } });
	}
	return resolve(event);
};
