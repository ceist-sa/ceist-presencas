import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The page used to be called "Membros"; old links keep working
export const GET: RequestHandler = ({ url }) => redirect(308, `/estatisticas${url.search}`);
