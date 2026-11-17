<script lang="ts">
	import EventCard from '$lib/components/EventCard.svelte';
	import { dayOfMonth, shortMonth } from '$lib/format';
	import { STATE_CELL as cell, STATE_LEGEND as legend } from '$lib/states';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';

	let { data } = $props();

	let view = $state<'summary' | 'grid'>('summary');
	// While another program is on its way, the current one stays on screen, dimmed
	const loading = $derived(navigating.to?.url.pathname === '/estatisticas');

	/** Changes program in place: the page keeps its scroll position, its view and the focus on the picker. */
	function choose(value: string) {
		goto(`/estatisticas?p=${encodeURIComponent(value)}`, { noScroll: true, keepFocus: true });
	}

	let card: EventCard;
</script>

<svelte:head>
	<title>Estatísticas · Presenças</title>
</svelte:head>

<h1 class="text-2xl font-bold">Estatísticas</h1>

<form method="GET" class="mt-3 max-w-md">
	<label class="label text-xs opacity-70" for="period">Programa ou temporada</label>
	<select
		id="period"
		name="p"
		class="mt-1 block w-full rounded-xl border border-ink/15 bg-paper px-3 py-2"
		onchange={(e) => choose(e.currentTarget.value)}
	>
		{#each data.periods as period (period.value)}
			<option value={period.value} selected={period.value === data.period.value}>{period.label}</option>
		{/each}
	</select>
	<noscript><button class="btn mt-2">Ver</button></noscript>
</form>

<div class="transition-opacity {loading ? 'opacity-40' : ''}" aria-busy={loading}>
<p class="mt-3 opacity-70">
	{#if data.columns.length === 1}
		1 evento registado.
	{:else}
		{data.columns.length} eventos registados.
	{/if}
</p>

{#if data.columns.length > 0}
	<div class="mt-4 flex max-w-md gap-1 rounded-full bg-ink/5 p-1 text-sm" role="group" aria-label="Vista">
		{#each [['summary', 'Resumo'], ['grid', 'Por evento']] as const as [value, label] (value)}
			<button
				type="button"
				class="label flex-1 rounded-full py-2 {view === value ? 'bg-ink text-paper' : ''}"
				aria-pressed={view === value}
				onclick={() => (view = value)}
			>
				{label}
			</button>
		{/each}
	</div>

	{#if view === 'summary'}
		<table class="mt-2 w-full text-right tabular-nums">
			<thead>
				<tr class="label text-xs opacity-70">
					<th class="py-2 text-left font-normal">Membro</th>
					<th class="px-1.5 py-2 font-normal" title="Presenças a horas">Pres.</th>
					<th class="px-1.5 py-2 font-normal" title="Meias presenças">Meia</th>
					<th class="px-1.5 py-2 font-normal" title="Faltas justificadas">Just.</th>
					<th class="px-1.5 py-2 font-normal" title="Faltas sem justificação">Faltas</th>
					<th class="py-2 pl-1.5 font-normal" title="Presenças nos eventos sem falta justificada">%</th>
				</tr>
			</thead>
			{#each data.sections as { section, onCall, members } (section)}
				<tbody>
					<tr>
						<th colspan="6" class="label pt-6 pb-2 text-left text-sm font-normal opacity-70">{section}</th>
					</tr>
					{#each members as member (member.id)}
						<tr class="border-t border-ink/10">
							<td class="py-2 text-left">
								<a href="/membros/{member.id}" class="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">{member.name}</a>
								{#if onCall}
									<span class="label block text-xs opacity-60">{member.section}</span>
								{/if}
							</td>
							<td class="px-1.5 py-2">{member.present}</td>
							<td class="px-1.5 py-2">{member.late}</td>
							<td class="px-1.5 py-2">{member.justified}</td>
							<td class="px-1.5 py-2">{member.absent}</td>
							<td class="py-2 pl-1.5 font-bold">{member.rate === null ? '–' : `${member.rate}%`}</td>
						</tr>
					{/each}
				</tbody>
			{/each}
		</table>
	{:else}
		<!--
			One row per member and one column per event. Scrolls sideways, with the names staying in place and
			never cut short. The name column has to hide what scrolls under it: so it is opaque (the faded text
			is in a span), it starts at the very edge of the scrolling area, and the gaps between the coloured
			cells are padding inside the cells instead of space between them.
		-->
		<div class="mt-2 overflow-x-auto" onscroll={() => card.hide()}>
			<table class="border-collapse text-center tabular-nums">
				<thead>
					<tr class="label text-xs">
						<th class="sticky left-0 z-10 bg-paper py-2 pr-3 text-left font-normal"><span class="opacity-70">Membro</span></th>
						{#each data.columns as column (column.key)}
							<th class="font-normal">
								<a
									href="/eventos/{column.key}"
									class="block min-w-9 px-1 py-1 leading-tight"
									onpointerenter={(e) => card.show(e.currentTarget, column)}
									onpointerleave={() => card.hide()}
									onfocus={(e) => card.show(e.currentTarget, column)}
									onblur={() => card.hide()}
								>
									<span class="block text-sm font-bold">{dayOfMonth(column.start)}</span>
									<span class="opacity-70">{shortMonth(column.start)}</span>
								</a>
							</th>
						{/each}
						<th class="py-2 pl-2 font-normal opacity-70">%</th>
					</tr>
				</thead>
				{#each data.sections as { section, onCall, members } (section)}
					<tbody>
						<tr>
							<th class="label sticky left-0 z-10 bg-paper pt-5 pb-1 text-left text-sm font-normal whitespace-nowrap">
								<span class="opacity-70">{section}</span>
							</th>
						</tr>
						{#each members as member (member.id)}
							<tr>
								<th class="sticky left-0 z-10 bg-paper py-1.5 pr-3 text-left font-normal whitespace-nowrap" title={onCall ? member.section : undefined}>
									<a href="/membros/{member.id}" class="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">{member.name}</a>
								</th>
								{#each member.cells as state, index (data.columns[index].key)}
									<td
										class="p-px"
										onpointerenter={(e) => card.show(e.currentTarget, data.columns[index], state, member.name)}
										onpointerleave={() => card.hide()}
									>
										<span class="block rounded-md py-1.5 text-sm {cell[state].colour}">{cell[state].letter}</span>
									</td>
								{/each}
								<td class="py-1.5 pl-2 text-right font-bold">{member.rate === null ? '–' : `${member.rate}%`}</td>
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
		<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each legend as state (state)}
				<li class="flex items-center gap-1.5">
					<span class="inline-block w-6 rounded-md py-0.5 text-center {cell[state].colour}">{cell[state].letter}</span>
					{cell[state].title}
				</li>
			{/each}
		</ul>
	{/if}

	<p class="mt-6 text-sm opacity-70">
		A percentagem conta as presenças nos eventos em que o membro não teve falta justificada; uma meia presença
		vale metade.
		Para os membros por convocação só contam os eventos para que foram convocados.
	</p>
{/if}
</div>

<EventCard bind:this={card} />
