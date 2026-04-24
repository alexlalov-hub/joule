<script lang="ts">
	import type { Product } from '$lib/catalog/types';
	import { formatPrice } from '$lib/catalog/types';

	let { product }: { product: Product } = $props();
</script>

<a
	href="/product/{product.slug}"
	class="group flex h-full flex-col overflow-hidden rounded-sm border border-ink/10 bg-paper transition-colors hover:border-accent/50"
	data-testid="product-card"
	data-product-slug={product.slug}
>
	<div class="aspect-[4/3] overflow-hidden bg-paper-warm">
		<img
			src={product.images[0]?.url}
			alt={product.images[0]?.alt}
			loading="lazy"
			decoding="async"
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
		/>
	</div>
	<div class="flex flex-1 flex-col p-5">
		<div class="mb-1 kicker">{product.brand}</div>
		<h3 class="font-serif text-lg leading-snug font-medium">{product.name}</h3>
		<p class="mt-1 text-sm text-ink-soft">{product.tagline}</p>
		<div class="mt-auto flex items-baseline justify-between pt-4">
			<span class="font-serif text-xl font-medium" data-testid="product-price">
				{formatPrice(product.priceCents)}
			</span>
			{#if product.rating}
				<span class="font-mono text-xs text-ink-faint">
					★ {product.rating.toFixed(1)}
					<span class="text-ink-faint/70">({product.reviewCount ?? 0})</span>
				</span>
			{/if}
		</div>
	</div>
</a>
