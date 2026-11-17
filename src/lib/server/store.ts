import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import * as local from './local';
import * as notion from './notion';

function store(): typeof notion | typeof local {
	if (env.NOTION_TOKEN) {
		return notion;
	}
	if (!dev) {
		throw new Error('NOTION_TOKEN is not configured');
	}
	return local;
}

/** Whether attendance is going to the local sample store instead of Notion. */
export const usingSampleData = () => !env.NOTION_TOKEN;

export const getMembers = () => store().getMembers();
/** The programs of every season, oldest first. */
export const getPrograms = () => store().getPrograms();
/** Events recorded since the given Lisbon time (`YYYY-MM-DDTHH:MM`). */
export const getAttendance = (since: string) => store().getAttendance(since);
export const saveAttendance: typeof notion.saveAttendance = (record, program) => store().saveAttendance(record, program);
