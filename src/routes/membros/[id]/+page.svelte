<script lang="ts">
	import EventCard, { when } from '$lib/components/EventCard.svelte';
	import { dayOfMonth, shortMonth } from '$lib/format';
	import { STATE_CELL as cell, STATE_LEGEND as legend } from '$lib/states';
	import type { Summary } from '$lib/stats';

	let { data } = $props();

	const status = { active: 'Ativo', onCall: 'Ativo por convocação', inactive: 'Inativo' };
	const rate = (summary: Summary) => (summary.rate === null ? '–' : `${summary.rate}%`);
	const called = (summary: Summary) => summary.present + summary.late + summary.justified + summary.absent;

	let card: EventCard;
</script>

<svelte:head>
	<title>{data.member.name} · Presenças</title>
</svelte:head>

{#snippet numbers(summary: Summary)}
	<td class="py-2 max-sm:hidden">{called(summary)}</td>
	<td class="py-2">{summary.present}</td>
	<td class="py-2">{summary.late}</td>
	<td class="py-2">{summary.justified}</td>
	<td class="py-2">{summary.absent}</td>
	<td class="py-2 font-bold">{rate(summary)}</td>
{/snippet}

<a href="/estatisticas" class="label text-sm opacity-70">← Estatísticas</a>
<h1 class="mt-3 text-2xl font-bold">{data.member.name}</h1>
<p class="opacity-70">{data.member.section} · {status[data.member.status]}</p>

{#if data.seasons.length === 0}
	<p class="mt-6 opacity-70">Sem presenças registadas.</p>
{:else}
	<!--
		Everything at a glance: all time, then each season and its programs. The number columns all have the
		same width, set here, and the names take what is left.
	-->
	<table class="mt-6 w-full max-w-3xl table-fixed text-right tabular-nums">
		<colgroup>
			<col />
			<col class="w-16 max-sm:hidden" />
			{#each { length: 5 } as _, index (index)}
				<col class="w-12 sm:w-16" />
			{/each}
		</colgroup>
		<thead>
			<tr class="label text-xs opacity-70">
				<th class="py-2 text-left font-normal">Período</th>
				<!-- Left out on phones, where it doesn't fit: it is the sum of the four that follow -->
				<th class="py-2 font-normal max-sm:hidden" title="Eventos para que foi convocado">Eventos</th>
				<th class="py-2 font-normal" title="Presenças a horas">Pres.</th>
				<th class="py-2 font-normal" title="Meias presenças">Meia</th>
				<th class="py-2 font-normal" title="Faltas justificadas">Just.</th>
				<th class="py-2 font-normal" title="Faltas sem justificação">Faltas</th>
				<th class="py-2 font-normal" title="Presenças nos eventos sem falta justificada">%</th>
			</tr>
		</thead>
		<tbody>
			<tr class="border-t border-ink/30 font-bold">
				<td class="py-2 text-left">Desde sempre</td>
				{@render numbers(data.total)}
			</tr>
		</tbody>
		{#each data.seasons as season (season.season)}
			<tbody>
				<tr class="border-t border-ink/30">
					<td class="label pt-5 pb-2 text-left text-sm">Temporada {season.season}</td>
					{@render numbers(season)}
				</tr>
				{#each season.groups as group (group.label)}
					<tr class="border-t border-ink/10">
						<td class="py-2 pl-2 text-left [overflow-wrap:anywhere] sm:pl-4">{group.name}</td>
						{@render numbers(group)}
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>

	<h2 class="label mt-10 text-sm opacity-70">Histórico</h2>
	<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
		{#each legend as state (state)}
			<li class="flex items-center gap-1.5">
				<span class="inline-block w-6 rounded-md py-0.5 text-center {cell[state].colour}">{cell[state].letter}</span>
				{cell[state].title}
			</li>
		{/each}
	</ul>

	{#each data.seasons as season (season.season)}
		{#each season.groups as group (group.label)}
			<section class="mt-6">
				<h3 class="font-bold">{group.label}</h3>
				<!-- One cell per event of the program, in date order, each leading to that event -->
				<ol class="mt-2 flex flex-wrap gap-1 text-center tabular-nums">
					{#each group.events as event (event.key)}
						<li>
							<a
								href="/eventos/{event.key}"
								aria-label="{event.title}, {when(event)}: {cell[event.state].title}"
								class="block w-11 rounded-md outline-offset-2"
								onpointerenter={(e) => card.show(e.currentTarget, event, event.state)}
								onpointerleave={() => card.hide()}
								onfocus={(e) => card.show(e.currentTarget, event, event.state)}
								onblur={() => card.hide()}
							>
								<span class="block text-sm leading-tight font-bold">{dayOfMonth(event.start)}</span>
								<span class="label block text-xs leading-tight opacity-70">{shortMonth(event.start)}</span>
								<span class="mt-1 block rounded-md py-1.5 text-sm {cell[event.state].colour}">{cell[event.state].letter}</span>
							</a>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	{/each}
{/if}

<EventCard bind:this={card} />
