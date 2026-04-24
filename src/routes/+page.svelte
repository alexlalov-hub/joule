<script lang="ts">
	import ProductGrid from '$lib/components/product/ProductGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>TechnoMarket 2.0 — an AI-augmented electronics store</title>
</svelte:head>

<section class="relative">
	<div class="mx-auto max-w-7xl px-6 pt-16 pb-10 md:px-10 md:pt-24 md:pb-16">
		<span
			class="inline-flex items-center gap-2 rounded-full border border-accent px-3 py-1 kicker text-accent"
		>
			Two sprints · BDD-verified · grounded AI
		</span>
		<h1 class="mt-6 font-serif text-5xl leading-[1] font-normal tracking-tight md:text-7xl">
			Shopping as <em class="text-accent italic">conversation,</em><br />
			not catalog lookup.
		</h1>
		<p
			class="mt-6 max-w-2xl font-serif text-xl leading-snug font-light text-ink-soft italic md:text-2xl"
		>
			A dusty first-year catalog reborn as a modern, personalised, AI-augmented electronics store —
			built to ask better questions than <em>"what's the cheapest?"</em>
		</p>
		<div class="mt-10 flex flex-wrap gap-3">
			<a
				href="/categories"
				class="inline-flex items-center rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
			>
				Browse the catalog
			</a>
			<a
				href="/search"
				class="inline-flex items-center rounded-sm border border-ink px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
			>
				Search
			</a>
		</div>

		<dl class="mt-16 grid gap-8 border-t border-ink/10 pt-8 text-sm text-ink-soft sm:grid-cols-4">
			<div>
				<dt class="kicker text-ink-faint">Products</dt>
				<dd class="mt-1 font-serif text-2xl font-medium" data-testid="stat-products">
					{data.productCount}
				</dd>
			</div>
			<div>
				<dt class="kicker text-ink-faint">Categories</dt>
				<dd class="mt-1 font-serif text-2xl font-medium" data-testid="stat-categories">
					{data.categories.length}
				</dd>
			</div>
			<div>
				<dt class="kicker text-ink-faint">Sprint</dt>
				<dd class="mt-1 font-serif text-2xl font-medium">1 of 2</dd>
			</div>
			<div>
				<dt class="kicker text-ink-faint">Stack</dt>
				<dd class="mt-1 font-serif text-2xl font-medium">SvelteKit · Supabase</dd>
			</div>
		</dl>
	</div>
</section>

<section class="bg-paper-warm">
	<div class="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
		<div class="mb-8 flex items-end justify-between">
			<div>
				<div class="kicker text-accent">Featured</div>
				<h2 class="mt-2 font-serif text-4xl font-normal">Editor's picks.</h2>
			</div>
			<a href="/categories" class="text-sm font-medium text-ink-soft hover:text-accent"
				>All products →</a
			>
		</div>
		<ProductGrid products={data.featured} />
	</div>
</section>

<section>
	<div class="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
		<div class="mb-8">
			<div class="kicker text-accent">Departments</div>
			<h2 class="mt-2 font-serif text-4xl font-normal">Browse by category.</h2>
		</div>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.categories as c (c.slug)}
				<li>
					<a
						href="/category/{c.slug}"
						class="group block rounded-sm border border-ink/10 p-5 transition-colors hover:border-accent"
					>
						<div class="font-serif text-xl font-medium">{c.name}</div>
						<p class="mt-1 text-sm text-ink-soft">{c.blurb}</p>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
