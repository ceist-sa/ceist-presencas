<script lang="ts">
	let { form } = $props();
</script>

<form method="POST" class="mx-auto mt-16 flex max-w-xs flex-col gap-4">
	<label class="flex flex-col gap-2">
		<span class="label text-sm">Palavra-passe</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="password"
			name="password"
			required
			autofocus
			autocomplete="current-password"
			class="rounded-xl border border-ink/30 bg-white px-4 py-3"
		/>
	</label>
	{#if form?.wrong}
		<p role="alert" class="rounded-xl bg-rose px-4 py-3 text-sm">Palavra-passe incorreta.</p>
	{/if}
	<button class="btn">Entrar</button>
</form>
