<script lang="ts">
	import { formatPrice } from '$lib/catalog/types';
	import { compareStore, MAX_COMPARE } from '$lib/compare/store.svelte';

	const items = $derived(compareStore.items);
	const canCompare = $derived(items.length >= 2);
</script>

{#if items.length > 0}
	<aside
		class="fixed right-4 bottom-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-sm border border-ink/15 bg-paper shadow-lg"
		data-testid="compare-tray"
		aria-label="Comparison tray"
	>
		<div class="flex items-center justify-between border-b border-ink/10 px-4 py-2">
			<div class="kicker text-accent">Compare</div>
			<div
				class="font-mono text-[11px] tracking-wider text-ink-faint"
				data-testid="compare-tray-count"
			>
				{items.length} / {MAX_COMPARE}
			</div>
		</div>

		<ul class="divide-y divide-ink/5">
			{#each items as item (item.slug)}
				<li class="flex items-center gap-3 px-4 py-2.5">
					<div class="min-w-0 flex-1">
						<div class="kicker text-ink-faint">{item.brand}</div>
						<a
							href="/product/{item.slug}"
							class="block truncate text-sm font-medium hover:text-accent"
						>
							{item.name}
						</a>
						<div class="font-mono text-xs text-ink-soft">{formatPrice(item.priceCents)}</div>
					</div>
					<button
						type="button"
						onclick={() => compareStore.remove(item.slug)}
						aria-label="Remove {item.name} from comparison"
						class="rounded-sm border border-transparent px-2 py-1 font-mono text-xs text-ink-faint hover:border-ink/15 hover:text-accent"
						data-testid="compare-tray-remove"
					>
						✕
					</button>
				</li>
			{/each}
		</ul>

		<div class="flex items-center gap-2 border-t border-ink/10 px-4 py-2.5">
			<button
				type="button"
				onclick={() => compareStore.clear()}
				class="rounded-sm border border-ink/15 px-3 py-1.5 text-xs text-ink-soft hover:border-ink/40"
			>
				Clear
			</button>
			<a
				href={compareStore.compareHref}
				aria-disabled={!canCompare}
				class="ml-auto inline-flex items-center rounded-sm bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-accent {canCompare
					? ''
					: 'pointer-events-none opacity-50'}"
				data-testid="compare-tray-cta"
			>
				{canCompare ? 'Compare now' : 'Add one more'}
			</a>
		</div>
	</aside>
{/if}
