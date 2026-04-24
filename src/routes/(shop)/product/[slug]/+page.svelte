<script lang="ts">
	import ProductGrid from '$lib/components/product/ProductGrid.svelte';
	import { formatPrice } from '$lib/catalog/types';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let activeImage = $state(0);
	let adding = $state(false);

	const imageCount = $derived(data.product.images.length);
	const outOfStock = $derived(data.product.stockQty <= 0);

	function prev() {
		activeImage = (activeImage - 1 + imageCount) % imageCount;
	}
	function next() {
		activeImage = (activeImage + 1) % imageCount;
	}
	function onKey(e: KeyboardEvent) {
		if (imageCount < 2) return;
		if (e.key === 'ArrowLeft') prev();
		else if (e.key === 'ArrowRight') next();
	}
</script>

<svelte:window onkeydown={onKey} />

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
			<div class="group relative aspect-[4/3] overflow-hidden rounded-sm bg-paper-warm">
				{#each data.product.images as image, i}
					<img
						src={image.url}
						alt={image.alt}
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 {activeImage ===
						i
							? 'opacity-100'
							: 'pointer-events-none opacity-0'}"
						loading={i === 0 ? 'eager' : 'lazy'}
					/>
				{/each}

				{#if imageCount > 1}
					<button
						type="button"
						onclick={prev}
						aria-label="Previous image"
						class="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-paper/80 p-2 text-ink opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-paper focus-visible:opacity-100"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
						>
					</button>
					<button
						type="button"
						onclick={next}
						aria-label="Next image"
						class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-paper/80 p-2 text-ink opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-paper focus-visible:opacity-100"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
						>
					</button>

					<div
						class="absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[11px] tracking-wider text-paper"
					>
						{activeImage + 1} / {imageCount}
					</div>
				{/if}
			</div>

			{#if imageCount > 1}
				<div class="mt-3 flex gap-2 overflow-x-auto pb-1">
					{#each data.product.images as image, i}
						<button
							type="button"
							class="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-sm border transition-colors {activeImage ===
							i
								? 'border-accent'
								: 'border-ink/10 hover:border-ink/30'}"
							onclick={() => (activeImage = i)}
							aria-label="View image {i + 1}"
							aria-current={activeImage === i}
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
				<form
					method="POST"
					action="?/addToCart"
					use:enhance={() => {
						adding = true;
						return async ({ update }) => {
							await update({ reset: false });
							adding = false;
						};
					}}
				>
					<button
						type="submit"
						class="inline-flex items-center rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
						disabled={adding || outOfStock}
						data-testid="add-to-cart"
					>
						{#if outOfStock}
							Out of stock
						{:else if adding}
							Adding…
						{:else if form?.added}
							Added ✓
						{:else}
							Add to cart
						{/if}
					</button>
				</form>
				<form method="POST" action="?/toggleWishlist" use:enhance>
					<button
						type="submit"
						class="inline-flex items-center rounded-sm border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
						data-testid="wishlist-toggle"
					>
						{#if data.wishlisted || form?.wishlisted === true}
							♥ Saved
						{:else}
							♡ Save to wishlist
						{/if}
					</button>
				</form>
			</div>
			{#if form && !form.added && form.message}
				<p class="mt-3 text-sm text-red-600" data-testid="add-to-cart-error">{form.message}</p>
			{/if}

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
