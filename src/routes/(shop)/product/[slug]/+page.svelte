<script lang="ts">
	import ProductGrid from '$lib/components/product/ProductGrid.svelte';
	import { formatPrice } from '$lib/catalog/types';

	let { data } = $props();
	let activeImage = $state(0);
</script>

<svelte:head>
	<title>{data.product.name} — TechnoMarket</title>
	<meta name="description" content={data.product.tagline} />
</svelte:head>

<article class="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
	<nav class="mb-6 font-mono text-xs tracking-widest text-ink-faint uppercase">
		<a href="/categories" class="hover:text-accent">Categories</a>
		{#if data.category}
			/ <a href="/category/{data.category.slug}" class="hover:text-accent">{data.category.name}</a>
		{/if}
		/ {data.product.name}
	</nav>

	<div class="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
		<div>
			<div class="aspect-[4/3] overflow-hidden rounded-sm bg-paper-warm">
				<img
					src={data.product.images[activeImage]?.url}
					alt={data.product.images[activeImage]?.alt}
					class="h-full w-full object-cover"
				/>
			</div>
			{#if data.product.images.length > 1}
				<div class="mt-3 grid grid-cols-{data.product.images.length} gap-2">
					{#each data.product.images as image, i}
						<button
							type="button"
							class="aspect-[4/3] overflow-hidden rounded-sm border transition-colors {activeImage ===
							i
								? 'border-accent'
								: 'border-ink/10 hover:border-ink/30'}"
							onclick={() => (activeImage = i)}
							aria-label="View image {i + 1}"
						>
							<img src={image.url} alt={image.alt} class="h-full w-full object-cover" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div>
			<div class="kicker text-accent">{data.product.brand}</div>
			<h1 class="mt-2 font-serif text-4xl leading-tight font-normal" data-testid="product-name">
				{data.product.name}
			</h1>
			<p class="mt-3 font-serif text-xl text-ink-soft italic">{data.product.tagline}</p>

			<div class="mt-6 flex items-baseline gap-4">
				<span class="font-serif text-3xl font-medium" data-testid="product-price">
					{formatPrice(data.product.priceCents)}
				</span>
				{#if data.product.rating}
					<span class="font-mono text-sm text-ink-faint">
						★ {data.product.rating.toFixed(1)} ({data.product.reviewCount ?? 0} reviews)
					</span>
				{/if}
			</div>

			<p class="mt-6 max-w-prose leading-relaxed">{data.product.description}</p>

			<div class="mt-8 flex flex-wrap gap-3">
				<button
					type="button"
					class="inline-flex items-center rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
					disabled
					data-testid="add-to-cart"
					aria-label="Add to cart (coming in week 2)"
				>
					Add to cart <span class="ml-2 font-mono text-xs text-paper/60">· week 2</span>
				</button>
				<button
					type="button"
					class="inline-flex items-center rounded-sm border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
					disabled
				>
					Save to wishlist
				</button>
			</div>

			<section class="mt-10 border-t border-ink/10 pt-6">
				<div class="mb-3 kicker text-ink-faint">Specifications</div>
				<dl class="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
					{#each data.product.specs as spec}
						<div class="flex flex-col">
							<dt class="font-mono text-[11px] tracking-wider text-ink-faint uppercase">
								{spec.label}
							</dt>
							<dd class="mt-1 text-ink">{spec.value}</dd>
						</div>
					{/each}
				</dl>
			</section>
		</div>
	</div>

	{#if data.related.length}
		<section class="mt-20 border-t border-ink/10 pt-12">
			<div class="mb-2 kicker text-accent">Related</div>
			<h2 class="mb-6 font-serif text-3xl font-normal">
				More in {data.category?.name ?? 'this department'}.
			</h2>
			<ProductGrid products={data.related} />
		</section>
	{/if}
</article>
