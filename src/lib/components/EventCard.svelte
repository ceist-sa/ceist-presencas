<script lang="ts" module>
	import { fullDate, time } from '$lib/format';

	export interface CardEvent {
		title: string;
		start: string;
		allDay: boolean;
	}

	/** "segunda-feira, 16 de novembro de 2026, 18:30" */
	export function when(event: CardEvent): string {
		return fullDate(event.start) + (event.allDay ? '' : `, ${time(event.start)}`);
	}
</script>

<script lang="ts">
	import { STATE_CELL } from '$lib/states';
	import type { MemberState } from '$lib/types';

	// The card that describes the event under the pointer or the keyboard focus, in place of the browser's
	// tooltip. It is fixed to the window and placed by hand, to keep it inside the window wherever the cell
	// is: next to an edge, or inside an area that scrolls and would cut it off.
	const WIDTH = 240;
	/** Roughly how tall the card gets, to know when it doesn't fit above the cell */
	const HEIGHT = 130;

	interface Card {
		event: CardEvent;
		/** The member's state at the event, when the cell is about one member */
		state?: MemberState;
		who?: string;
		left: number;
		top: number;
		below: boolean;
	}
	let card = $state<Card | null>(null);

	/** Shows the card over the element, or under it when there is no room above. */
	export function show(target: HTMLElement, event: CardEvent, state?: MemberState, who?: string) {
		const box = target.getBoundingClientRect();
		const half = WIDTH / 2 + 8;
		const below = box.top < HEIGHT;
		card = {
			event,
			state,
			who,
			left: Math.min(Math.max(box.left + box.width / 2, half), window.innerWidth - half),
			top: below ? box.bottom + 8 : box.top - 8,
			below
		};
	}

	export function hide() {
		card = null;
	}
</script>

<!-- Scrolling moves the cell away from under the card -->
<svelte:window onscroll={hide} />

{#if card}
	<div
		role="tooltip"
		class="pointer-events-none fixed z-30 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-left text-sm text-paper shadow-lg {card.below ? '' : '-translate-y-full'}"
		style="left: {card.left}px; top: {card.top}px; width: {WIDTH}px"
	>
		<div class="font-bold">{card.event.title}</div>
		<div class="opacity-80 first-letter:uppercase">{when(card.event)}</div>
		{#if card.state}
			<div class="mt-1.5 flex items-center gap-2">
				<span
					class="inline-block w-6 shrink-0 rounded-md py-0.5 text-center {card.state === 'notCalled' ? 'bg-paper/20' : `text-ink ${STATE_CELL[card.state].colour}`}"
				>
					{STATE_CELL[card.state].letter}
				</span>
				<span>{card.who ? `${card.who}: ` : ''}{STATE_CELL[card.state].title}</span>
			</div>
		{/if}
	</div>
{/if}
