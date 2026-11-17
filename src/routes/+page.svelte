<script lang="ts">
	import { dayOfMonth, shortMonth, time, weekday } from '$lib/format';

	let { data } = $props();
</script>

{#snippet row(event: (typeof data.past)[number], isPast: boolean)}
	{@const isToday = event.start.slice(0, 10) === data.today}
	<li>
		<a
			href="/eventos/{event.key}"
			class="flex items-center gap-4 rounded-xl border px-4 py-3 {isToday ? 'border-ink bg-sky' : 'border-ink/15'}"
		>
			<div class="w-16 shrink-0 text-center leading-tight">
				<div class="label text-xs">{isToday ? 'Hoje' : weekday(event.start)}</div>
				<div class="text-2xl font-bold">{dayOfMonth(event.start)}</div>
				<div class="label text-xs">{shortMonth(event.start)}</div>
			</div>
			<div class="min-w-0 flex-1">
				<div class="font-bold">{event.title}</div>
				<div class="truncate text-sm opacity-70">
					{#if !event.allDay}{time(event.start)}{#if event.end}–{time(event.end)}{/if}{/if}
					{#if event.location}· {event.location}{/if}
				</div>
			</div>
			{#if event.present !== null}
				<div class="label shrink-0 rounded-full bg-sage px-3 py-1 text-sm">{event.present} presentes</div>
			{:else if isPast}
				<div class="label shrink-0 rounded-full bg-sand px-3 py-1 text-sm">Por registar</div>
			{/if}
		</a>
	</li>
{/snippet}

{#if data.sampleData}
	<p class="mb-6 rounded-xl bg-sand px-4 py-3 text-sm">
		Modo de desenvolvimento: sem ligação ao Notion. Os membros são de exemplo e as presenças ficam em
		<code>data/attendance.json</code>.
	</p>
{/if}

<section>
	<h1 class="label mb-3 text-sm opacity-70">Próximos eventos</h1>
	{#if data.upcoming.length}
		<ul class="flex flex-col gap-2">
			{#each data.upcoming as event, index (event.key)}
				{#if data.hasPrograms && event.program !== data.upcoming[index - 1]?.program}
					<li class="label text-xs opacity-60 {index ? 'mt-4' : ''}">{event.program ?? 'Sem programa'}</li>
				{/if}
				{@render row(event, false)}
			{/each}
		</ul>
	{:else}
		<p class="opacity-70">Não há eventos marcados no calendário.</p>
	{/if}
</section>

{#if data.past.length}
	<section class="mt-8">
		<h2 class="label mb-3 text-sm opacity-70">Eventos anteriores</h2>
		<ul class="flex flex-col gap-2">
			{#each data.past as event, index (event.key)}
				<!-- The list is in date order, so a change of program starts a new block -->
				{#if data.hasPrograms && event.program !== data.past[index - 1]?.program}
					<li class="label text-xs opacity-60 {index ? 'mt-4' : ''}">{event.program ?? 'Sem programa'}</li>
				{/if}
				{@render row(event, true)}
			{/each}
		</ul>
	</section>
{/if}
