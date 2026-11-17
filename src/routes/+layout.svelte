<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Eventos' },
		{ href: '/estatisticas', label: 'Estatísticas' }
	];
	const signedIn = $derived(page.url.pathname !== '/login');
</script>

<svelte:head>
	<title>Presenças · CEIST</title>
</svelte:head>

<header class="border-b border-ink/15">
	<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
		<a href="/" class="flex shrink-0 items-center gap-3">
			<img src="/icon.svg" alt="CEIST" class="size-8" />
			<!-- On a phone there is only room for the logo next to the links -->
			<span class="label text-lg {signedIn ? 'max-sm:sr-only' : ''}">Presenças</span>
		</a>
		{#if signedIn}
			<nav class="label ml-auto flex items-center gap-4 text-sm whitespace-nowrap">
				{#each links as link (link.href)}
					{@const inStatistics = page.url.pathname.startsWith('/estatisticas') || page.url.pathname.startsWith('/membros')}
					{@const current = (link.href === '/estatisticas') === inStatistics}
					<a href={link.href} class="py-2 {current ? 'underline underline-offset-8' : 'opacity-60'}" aria-current={current ? 'page' : undefined}>
						{link.label}
					</a>
				{/each}
				<form method="POST" action="/logout">
					<button class="label py-2 opacity-60">Sair</button>
				</form>
			</nav>
		{/if}
	</div>
</header>

<main class="mx-auto max-w-5xl px-4 py-6">
	{@render children()}
</main>
