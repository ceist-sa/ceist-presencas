<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { longDate, time } from '$lib/format';
	import { defaultState, type MemberState } from '$lib/types';
	import Cards, { type Person } from '$lib/components/Cards.svelte';

	let { data, form } = $props();

	// Starts from what is recorded and is then the user's to edit
	let states = $state<Record<string, MemberState>>(untrack(() => ({ ...data.states })));

	const people = $derived(data.sections.flatMap((s) => s.members.map((m): Person => ({ ...m, onCall: s.onCall }))));
	const came = (id: string) => states[id] === 'present' || states[id] === 'late';
	const count = (list: Person[], ...wanted: MemberState[]) => list.filter((p) => wanted.includes(states[p.id])).length;

	// The count is of regular members; those who only come when called up are reported apart
	const regular = $derived(people.filter((p) => !p.onCall));
	const regularCalled = $derived(regular.length - count(regular, 'notCalled'));
	const regularCame = $derived(count(regular, 'present', 'late'));
	const onCallCame = $derived(count(people, 'present', 'late') - regularCame);
	const lateCount = $derived(count(people, 'late'));
	const justifiedCount = $derived(count(people, 'justified'));

	const snapshot = () => JSON.stringify(people.map((p) => [p.id, states[p.id]]));
	let savedSnapshot = $state(untrack(snapshot));
	let saving = $state(false);
	const unsaved = $derived(snapshot() !== savedSnapshot || !data.recorded);

	const { event } = $derived(data);

	/** Sets a state, or goes back to the member's default if that state is already set. */
	function toggle(person: Person, state: MemberState) {
		states[person.id] = states[person.id] === state ? defaultState(person) : state;
	}

	/** "Falta" switches between absent and not called, for regular members too (e.g. a strings-only rehearsal). */
	function toggleAbsent(person: Person) {
		states[person.id] = states[person.id] === 'absent' ? 'notCalled' : 'absent';
	}

	// The cards are an alternative way of filling in the same states, offered on phones only
	let mode = $state<'list' | 'cards'>('list');
	// Members given a state on a card, to tell a chosen "Falta" from one nobody has looked at yet
	let chosen = $state<string[]>([]);
	// Members who come when called up only get a card once they have a state or are added by hand
	let added = $state(untrack(() => Object.keys(data.states).filter((id) => data.states[id] !== 'notCalled')));
	const deck = $derived(people.filter((p) => !p.onCall || added.includes(p.id)));
	const notInDeck = $derived(people.filter((p) => p.onCall && !added.includes(p.id)));

	const rowColour: Record<MemberState, string> = {
		present: 'bg-present',
		late: 'bg-late',
		absent: 'bg-absent',
		justified: 'bg-justified',
		notCalled: 'outline outline-1 -outline-offset-1 outline-ink/15'
	};
</script>

<svelte:head>
	<title>{event.title} · Presenças</title>
</svelte:head>

<a href="/" class="label text-sm opacity-70">← Eventos</a>
<h1 class="mt-3 text-2xl font-bold">{event.title}</h1>
<p class="opacity-70">
	<span class="first-letter:uppercase">{longDate(event.start)}</span>{#if !event.allDay}, {time(event.start)}{/if}
	{#if event.location}· {event.location}{/if}
</p>

<div class="mt-4 flex gap-1 rounded-full bg-ink/5 p-1 text-sm sm:hidden" role="group" aria-label="Modo de registo">
	{#each [['list', 'Lista'], ['cards', 'Cartões']] as const as [value, label] (value)}
		<button
			type="button"
			class="label flex-1 rounded-full py-2 {mode === value ? 'bg-ink text-paper' : ''}"
			aria-pressed={mode === value}
			onclick={() => (mode = value)}
		>
			{label}
		</button>
	{/each}
</div>

<form
	method="POST"
	class="mt-4 pb-28"
	use:enhance={() => {
		saving = true;
		const submitted = snapshot();
		return async ({ result, update }) => {
			if (result.type === 'success') savedSnapshot = submitted;
			// Keep the states as they are instead of resetting the form
			await update({ reset: false });
			saving = false;
		};
	}}
>
	{#each people as person (person.id)}
		<input type="hidden" name="state" value="{person.id}:{states[person.id]}" />
	{/each}

	{#if mode === 'cards'}
		<div class="sm:hidden">
			<Cards
				people={deck}
				others={notInDeck}
				add={(person) => (added = [...added, person.id])}
				stateOf={(person) => states[person.id]}
				isDecided={(person) => data.recorded || chosen.includes(person.id) || states[person.id] !== defaultState(person)}
				choose={(person, state) => {
					states[person.id] = state;
					chosen = [...chosen, person.id];
				}}
				showList={() => (mode = 'list')}
			/>
		</div>
	{/if}

	<div class={mode === 'cards' ? 'max-sm:hidden' : ''}>
		{#each data.sections as { section, onCall } (section)}
			{@const members = people.filter((p) => p.onCall === onCall && (onCall || p.section === section))}
			<h2 class="label mb-2 text-sm opacity-70 {onCall ? 'mt-10 border-t border-ink/15 pt-6' : 'mt-6'}">{section}</h2>
			<ul class="flex flex-col gap-1">
				{#each members as member (member.id)}
					{@const state = states[member.id]}
					<li class="flex items-center gap-2 rounded-xl pr-2 {rowColour[state]}">
						<label class="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
							<input
								type="checkbox"
								checked={came(member.id)}
								onchange={(e) => (states[member.id] = e.currentTarget.checked ? 'present' : defaultState(member))}
								class="size-6 shrink-0 accent-ink"
							/>
							<span class="min-w-0 leading-tight">
								{member.name}
								{#if onCall}
									<span class="label block text-xs opacity-60">{member.section}</span>
								{:else if state === 'notCalled'}
									<span class="label block text-xs opacity-60">não convocado</span>
								{:else if member.status === 'inactive'}
									<span class="label block text-xs opacity-60">inativo</span>
								{/if}
							</span>
						</label>
						{#if came(member.id)}
							<button
								type="button"
								class="pill"
								aria-pressed={state === 'late'}
								onclick={() => (states[member.id] = state === 'late' ? 'present' : 'late')}
							>
								Atraso
							</button>
						{:else}
							<!-- With neither of these, the member wasn't called to this event -->
							<button type="button" class="pill" aria-pressed={state === 'absent'} onclick={() => toggleAbsent(member)}>
								Falta
							</button>
							<button type="button" class="pill" aria-pressed={state === 'justified'} onclick={() => toggle(member, 'justified')}>
								Justificada
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/each}
	</div>

	<div class="fixed inset-x-0 bottom-0 border-t border-ink/15 bg-paper">
		<div class="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
			<div class="flex-1 leading-tight">
				<div class="font-bold">{regularCame} de {regularCalled} presentes</div>
				<div class="text-sm opacity-70" role="status">
					{#if form?.failed}
						Não foi possível guardar. Tenta outra vez.
					{:else}
						{unsaved ? 'Por guardar' : 'Guardado'}{#if onCallCame}&nbsp;· +{onCallCame} por convocação{/if}{#if lateCount}&nbsp;· {lateCount} {lateCount === 1 ? 'atraso' : 'atrasos'}{/if}{#if justifiedCount}&nbsp;· {justifiedCount} {justifiedCount === 1 ? 'justificada' : 'justificadas'}{/if}
					{/if}
				</div>
			</div>
			<button class="btn" disabled={saving || !unsaved}>{saving ? 'A guardar…' : 'Guardar'}</button>
		</div>
	</div>
</form>
