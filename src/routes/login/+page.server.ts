import { fail, redirect } from '@sveltejs/kit';
import { signIn, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const password = String((await request.formData()).get('password') ?? '');
		const token = signIn(password);
		if (!token) {
			// Slows down guessing
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return fail(401, { wrong: true });
		}

		cookies.set(SESSION_COOKIE, token, { path: '/', maxAge: 60 * 60 * 24 * 180 });

		// Only follow links back into this site
		const next = url.searchParams.get('next') ?? '/';
		redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/');
	}
};
