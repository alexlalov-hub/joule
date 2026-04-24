<script lang="ts">
	import type { Product } from '$lib/catalog/types';
	import ProductCard from './ProductCard.svelte';

	let {
		products,
		empty = 'No products match your filters.'
	}: { products: Product[]; empty?: string } = $props();
</script>

{#if products.length === 0}
	<div class="rounded-sm border border-dashed border-ink/10 p-12 text-center text-ink-faint">
		{empty}
	</div>
{:else}
	<ul
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		data-testid="product-grid"
	>
		{#each products as product (product.slug)}
			<li><ProductCard {product} /></li>
		{/each}
	</ul>
{/if}
