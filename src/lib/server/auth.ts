import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'presencas_session';

/** The cookie holds a digest of the password, so changing the password signs everyone out. */
function sessionToken(password: string): string {
	return createHmac('sha256', password).update('ceist-presencas-session').digest('hex');
}

function sameToken(a: string, b: string): boolean {
	const bufferA = Buffer.from(a);
	const bufferB = Buffer.from(b);
	return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** The session cookie value for a correct password, or undefined for a wrong one. */
export function signIn(password: string): string | undefined {
	if (!env.APP_PASSWORD) return undefined;
	const token = sessionToken(password);
	return sameToken(token, sessionToken(env.APP_PASSWORD)) ? token : undefined;
}

export function isSignedIn(cookie: string | undefined): boolean {
	return !!env.APP_PASSWORD && !!cookie && sameToken(cookie, sessionToken(env.APP_PASSWORD));
}
