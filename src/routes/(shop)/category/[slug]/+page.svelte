<script lang="ts">
	import ProductGrid from '$lib/components/product/ProductGrid.svelte';
	import FilterSidebar from '$lib/components/catalog/FilterSidebar.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.category.name} — TechnoMarket</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
	<nav class="mb-6 font-mono text-xs tracking-widest text-ink-faint uppercase">
		<a href="/categories" class="hover:text-accent">Categories</a> / {data.category.name}
	</nav>

	<header class="mb-10 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="font-serif text-5xl font-normal">{data.category.name}</h1>
			<p class="mt-2 max-w-xl font-serif text-lg text-ink-soft italic">{data.category.blurb}</p>
		</div>
		<div class="font-mono text-sm text-ink-faint">
			<span data-testid="result-count">{data.products.length}</span>
			{data.products.length === 1 ? 'product' : 'products'}
		</div>
	</header>

	<div class="grid gap-10 lg:grid-cols-[240px_1fr]">
		<aside class="lg:sticky lg:top-24 lg:h-fit">
			<FilterSidebar
				brands={data.brands}
				selectedBrand={data.filters.brand}
				minPrice={data.filters.minPrice}
				maxPrice={data.filters.maxPrice}
				priceMin={data.priceMin}
				priceMax={data.priceMax}
				sort={data.filters.sort}
			/>
		</aside>
		<ProductGrid
			products={data.products}
			empty="Nothing matches those filters. Try widening the price range."
		/>
	</div>
</section>
