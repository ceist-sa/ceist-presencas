<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Membros · Presenças</title>
</svelte:head>

<h1 class="text-2xl font-bold">Assiduidade</h1>
<p class="opacity-70">
	{#if data.events === 1}
		1 evento registado esta temporada.
	{:else}
		{data.events} eventos registados esta temporada.
	{/if}
</p>

{#if data.events > 0}
	<table class="mt-6 w-full text-right tabular-nums">
		<thead>
			<tr class="label text-xs opacity-70">
				<th class="py-2 text-left font-normal">Membro</th>
				<th class="px-1.5 py-2 font-normal" title="Presenças a horas">Pres.</th>
				<th class="px-1.5 py-2 font-normal" title="Atrasos">Atr.</th>
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
							{member.name}
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
	<p class="mt-6 text-sm opacity-70">
		A percentagem conta as presenças, com ou sem atraso, nos eventos em que o membro não teve falta justificada.
		Para os membros por convocação só contam os eventos para que foram convocados.
	</p>
{/if}
