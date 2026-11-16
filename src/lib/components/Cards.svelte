<script lang="ts" module>
	import type { Member, MemberState } from '$lib/types';

	export interface Person {
		id: string;
		name: string;
		section: string;
		onCall: boolean;
		status: Member['status'];
		photo?: string;
	}
</script>

<script lang="ts">
	// One member at a time, with a button per state: an alternative to the list for phones.
	interface Props {
		/** The members to go through: the regular ones, plus those called up for this event */
		people: Person[];
		/** Members who come when called up and have no card yet */
		others: Person[];
		/** Gives one of the others a card */
		add: (person: Person) => void;
		/** The member's state as it stands */
		stateOf: (person: Person) => MemberState;
		/** Whether that state was recorded or chosen, rather than being the untouched default */
		isDecided: (person: Person) => boolean;
		choose: (person: Person, state: MemberState) => void;
		/** Leaves the cards for the list */
		showList: () => void;
	}
	let { people, others, add, stateOf, isDecided, choose, showList }: Props = $props();

	let adding = $state(false);

	function addPerson(other: Person) {
		add(other);
		adding = false;
		index = people.findIndex((p) => p.id === other.id);
	}

	let index = $state(0);
	const person = $derived(people[index]);
	// Photo links from Notion expire, so one that fails to load falls back to the initials
	let broken = $state<string[]>([]);

	const buttons: { choice: MemberState; label: string; colour: string }[] = [
		{ choice: 'present', label: 'Presente', colour: 'bg-present' },
		{ choice: 'late', label: 'Atraso', colour: 'bg-late' },
		{ choice: 'absent', label: 'Falta', colour: 'bg-absent' },
		{ choice: 'justified', label: 'Justificada', colour: 'bg-justified' }
	];

	function initials(name: string): string {
		const words = name.split(/\s+/).filter(Boolean);
		return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
	}

	function pick(choice: MemberState) {
		choose(person, choice);
		index += 1;
	}
</script>

<div class="mb-1 flex items-center justify-between">
	<button type="button" class="label py-2 text-sm disabled:opacity-30" disabled={index === 0} onclick={() => (index -= 1)}>
		← Anterior
	</button>
	<span class="label text-sm opacity-70">{Math.min(index + 1, people.length)} de {people.length}</span>
	<button type="button" class="label py-2 text-sm disabled:opacity-30" disabled={index >= people.length} onclick={() => (index += 1)}>
		Seguinte →
	</button>
</div>

{#if person}
	{@const current = isDecided(person) ? stateOf(person) : null}
	{#key person.id}
		<div class="flex flex-col items-center rounded-2xl border border-ink/15 px-4 py-4 text-center">
			{#if person.photo && !broken.includes(person.id)}
				<img
					src={person.photo}
					alt=""
					class="size-32 rounded-full object-cover"
					onerror={() => (broken = [...broken, person.id])}
				/>
			{:else}
				<div class="label flex size-32 items-center justify-center rounded-full bg-sand text-4xl" aria-hidden="true">
					{initials(person.name)}
				</div>
			{/if}
			<h2 class="mt-3 text-2xl leading-tight font-bold">{person.name}</h2>
			<p class="label mt-1 text-sm opacity-70">
				{person.section}{#if person.onCall}&nbsp;· por convocação{/if}
			</p>
		</div>
	{/key}

	<div class="mt-3 grid grid-cols-2 gap-2">
		{#each buttons as button (button.choice)}
			<button
				type="button"
				class="label rounded-xl py-4 text-sm {button.colour} {current === button.choice ? 'outline-2 -outline-offset-2 outline-ink' : ''}"
				aria-pressed={current === button.choice}
				onclick={() => pick(button.choice)}
			>
				{button.label}
			</button>
		{/each}
		<!-- For anyone not expected at this event: on-call members, or a section that isn't playing -->
		<button
			type="button"
			class="label col-span-2 rounded-xl border border-ink/30 py-3 text-sm {current === 'notCalled' ? 'outline-2 -outline-offset-2 outline-ink' : ''}"
			aria-pressed={current === 'notCalled'}
			onclick={() => pick('notCalled')}
		>
			Não convocado
		</button>
	</div>
{:else}
	<div class="rounded-2xl border border-ink/15 px-4 py-10 text-center">
		<h2 class="text-2xl font-bold">Chegaste ao fim</h2>
		<p class="mt-2 opacity-70">Revê a lista ou guarda as presenças.</p>
		<div class="mt-6 flex flex-col items-center gap-2">
			<button type="button" class="label rounded-full border border-ink/40 px-5 py-3 text-sm" onclick={showList}>
				Ver lista
			</button>
			{#if others.length && !adding}
				<button type="button" class="label rounded-full border border-ink/40 px-5 py-3 text-sm" onclick={() => (adding = true)}>
					Adicionar mais músicos
				</button>
			{/if}
		</div>
	</div>

	{#if others.length && adding}
		<h3 class="label mt-6 mb-2 text-sm opacity-70">Músicos por convocação</h3>
		<ul class="flex flex-col gap-1">
			{#each others as other (other.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-center justify-between gap-3 rounded-xl bg-ink/5 px-4 py-3 text-left"
						onclick={() => addPerson(other)}
					>
						<span class="leading-tight">
							{other.name}
							<span class="label block text-xs opacity-60">{other.section}</span>
						</span>
						<span class="label text-xs">Adicionar</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
