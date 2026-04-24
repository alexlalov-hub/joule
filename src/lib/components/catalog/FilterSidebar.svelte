<script lang="ts">
	import { page } from '$app/state';
	import { formatPrice } from '$lib/catalog/types';

	type Props = {
		brands: string[];
		selectedBrand?: string;
		minPrice?: number;
		maxPrice?: number;
		priceMin: number;
		priceMax: number;
		sort?: string;
	};

	let { brands, selectedBrand, minPrice, maxPrice, priceMin, priceMax, sort }: Props = $props();

	const hasActiveFilters = $derived(
		!!selectedBrand ||
			minPrice !== undefined ||
			maxPrice !== undefined ||
			(!!sort && sort !== 'featured')
	);
</script>

<form method="get" class="space-y-6">
	<div>
		<label for="sort" class="mb-2 block kicker text-ink-faint">Sort</label>
		<select
			id="sort"
			name="sort"
			class="w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			value={sort ?? 'featured'}
		>
			<option value="featured">Featured</option>
			<option value="price_asc">Price — low to high</option>
			<option value="price_desc">Price — high to low</option>
			<option value="name">Name (A–Z)</option>
		</select>
	</div>

	<div>
		<div class="mb-2 kicker text-ink-faint">Brand</div>
		<select
			id="brand"
			name="brand"
			class="w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			value={selectedBrand ?? ''}
		>
			<option value="">All brands</option>
			{#each brands as b}
				<option value={b}>{b}</option>
			{/each}
		</select>
	</div>

	<div>
		<div class="mb-2 kicker text-ink-faint">
			Price ({formatPrice(priceMin)} – {formatPrice(priceMax)})
		</div>
		<div class="grid grid-cols-2 gap-2">
			<label class="text-xs text-ink-soft">
				Min
				<input
					type="number"
					name="min"
					min={priceMin / 100}
					max={priceMax / 100}
					step="10"
					value={minPrice ? minPrice / 100 : ''}
					class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
				/>
			</label>
			<label class="text-xs text-ink-soft">
				Max
				<input
					type="number"
					name="max"
					min={priceMin / 100}
					max={priceMax / 100}
					step="10"
					value={maxPrice ? maxPrice / 100 : ''}
					class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
				/>
			</label>
		</div>
	</div>

	<button
		type="submit"
		class="w-full rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent"
	>
		Apply filters
	</button>

	{#if hasActiveFilters}
		<a
			href={page.url.pathname}
			data-testid="reset-filters"
			class="block text-center font-mono text-xs tracking-widest text-ink-faint uppercase underline-offset-4 hover:text-accent hover:underline"
		>
			Reset filters
		</a>
	{/if}
</form>
