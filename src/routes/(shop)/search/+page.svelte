<script lang="ts">
	import ProductGrid from '$lib/components/product/ProductGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.q ? `Search: ${data.q}` : 'Search'} — Joule</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
	<div class="kicker text-accent">Search</div>
	<h1 class="mt-2 font-serif text-5xl font-normal">Find the right piece of kit.</h1>

	<form method="get" class="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
		<label class="flex-1">
			<span class="sr-only">Search query</span>
			<input
				type="search"
				name="q"
				value={data.q}
				placeholder="MacBook, headphones, RTX…"
				class="w-full rounded-sm border border-ink/20 bg-paper px-4 py-3 text-base focus:border-accent"
				data-testid="search-input"
				autocomplete="off"
			/>
		</label>
		<label class="sm:w-56">
			<span class="sr-only">Category</span>
			<select
				name="category"
				value={data.category ?? ''}
				class="w-full rounded-sm border border-ink/20 bg-paper px-4 py-3 text-base focus:border-accent"
			>
				<option value="">All departments</option>
				{#each data.categories as c}
					<option value={c.slug}>{c.name}</option>
				{/each}
			</select>
		</label>
		<button
			type="submit"
			class="rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
		>
			Search
		</button>
	</form>

	<div class="mt-12">
		{#if !data.q}
			<p class="font-serif text-lg text-ink-soft italic">
				Type a query to search. Semantic search (pgvector) arrives in week 2.
			</p>
		{:else}
			<p class="mb-6 font-mono text-sm text-ink-faint">
				<span data-testid="result-count">{data.products.length}</span>
				{data.products.length === 1 ? 'result' : 'results'} for "<span class="text-ink"
					>{data.q}</span
				>"
			</p>
			<ProductGrid
				products={data.products}
				empty="No matches. Try fewer keywords or a different category."
			/>
		{/if}
	</div>
</section>
