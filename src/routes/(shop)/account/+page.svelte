<script lang="ts">
	import { formatPrice } from '$lib/catalog/types';
	import { reasonText } from '$lib/recommendations/types';

	let { data } = $props();

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-IE', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head><title>Account — Joule</title></svelte:head>

<section class="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
	<div class="flex flex-wrap items-baseline justify-between gap-4">
		<div>
			<div class="kicker text-accent">Account</div>
			<h1 class="mt-2 font-serif text-4xl font-normal">Welcome back.</h1>
			<p class="mt-2 font-serif text-lg text-ink-soft">
				Signed in as <span class="text-ink">{data.user.email}</span>.
			</p>
		</div>
		<form method="POST" action="/logout">
			<button
				type="submit"
				class="font-mono text-xs tracking-widest text-ink-faint uppercase hover:text-accent"
			>
				Sign out
			</button>
		</form>
	</div>

	<section class="mt-14">
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="font-serif text-2xl font-normal">Orders</h2>
			<span class="font-mono text-xs tracking-widest text-ink-faint uppercase">
				{data.orders.length} recent
			</span>
		</div>
		{#if data.orders.length === 0}
			<p class="rounded-sm border border-ink/10 bg-paper-warm p-6 font-serif text-ink-soft italic">
				No orders yet.
			</p>
		{:else}
			<ul class="divide-y divide-ink/10 border-y border-ink/10" data-testid="order-list">
				{#each data.orders as order (order.id)}
					<li class="py-4" data-testid="order-row">
						<div class="flex flex-wrap items-baseline justify-between gap-3">
							<div>
								<div class="font-mono text-xs text-ink-faint">
									#{order.id.slice(0, 8)} · {formatDate(order.created_at)}
								</div>
								<div class="mt-1 font-serif text-lg">
									{(order.order_items ?? [])
										.map((i) => `${i.quantity}× ${i.product_name}`)
										.join(', ')}
								</div>
							</div>
							<div class="text-right">
								<div class="font-serif text-lg font-medium">
									{formatPrice(order.total_cents)}
								</div>
								<div
									class="mt-1 inline-block rounded-sm bg-ink/5 px-2 py-0.5 font-mono text-[11px] tracking-wider uppercase"
									class:text-accent={order.status === 'paid'}
									class:text-amber-700={order.status === 'pending'}
								>
									{order.status === 'pending' ? 'payment needed' : order.status}
								</div>
								{#if order.status === 'pending'}
									<form method="POST" action="/checkout/resume" class="mt-2">
										<input type="hidden" name="orderId" value={order.id} />
										<button
											type="submit"
											class="font-mono text-xs tracking-widest text-accent uppercase underline-offset-4 hover:underline"
											data-testid="resume-payment"
										>
											Resume payment →
										</button>
									</form>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.recommendations.length > 0}
		<section class="mt-14" data-testid="recommendations">
			<div class="mb-4 flex items-baseline justify-between">
				<h2 class="font-serif text-2xl font-normal">Picked for you</h2>
				<span class="font-mono text-xs tracking-widest text-ink-faint uppercase">
					{data.recommendations.length} ideas
				</span>
			</div>
			<p class="mb-5 max-w-prose text-sm text-ink-soft">
				Based on what you've bought and saved. Every suggestion shows the exact reason — no opaque
				"you might also like" here.
			</p>
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.recommendations as rec (rec.product.slug)}
					<li
						class="rounded-sm border border-ink/10 bg-paper-warm p-3"
						data-testid="recommendation"
					>
						<a href="/product/{rec.product.slug}" class="block">
							<div class="aspect-[4/3] overflow-hidden rounded-sm bg-paper">
								{#if rec.product.images[0]}
									<img
										src={rec.product.images[0].url}
										alt={rec.product.images[0].alt}
										class="h-full w-full object-cover"
										loading="lazy"
									/>
								{/if}
							</div>
							<div class="mt-3 kicker text-ink-faint">{rec.product.brand}</div>
							<div class="mt-1 font-serif text-base leading-snug">{rec.product.name}</div>
							<div class="mt-2 font-mono text-sm">{formatPrice(rec.product.priceCents)}</div>
						</a>
						<p
							class="mt-3 border-t border-ink/10 pt-3 text-xs leading-snug text-ink-soft"
							data-testid="recommendation-reason"
						>
							<span class="text-accent">↳</span>
							{reasonText(rec.reason)}
							<a
								href="/product/{rec.reason.anchorSlug}"
								class="ml-1 font-mono text-[11px] text-ink-faint hover:text-accent"
							>
								[{rec.reason.anchorSlug}]
							</a>
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="mt-14">
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="font-serif text-2xl font-normal">Wishlist</h2>
			<span class="font-mono text-xs tracking-widest text-ink-faint uppercase">
				{data.wishlist.length} saved
			</span>
		</div>
		{#if data.wishlist.length === 0}
			<p class="rounded-sm border border-ink/10 bg-paper-warm p-6 font-serif text-ink-soft italic">
				Nothing saved yet.
			</p>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.wishlist as item (item.productId)}
					<li class="rounded-sm border border-ink/10 bg-paper-warm p-3">
						<a href="/product/{item.slug}" class="block">
							<div class="aspect-[4/3] overflow-hidden rounded-sm bg-paper">
								{#if item.image}
									<img
										src={item.image}
										alt={item.name}
										class="h-full w-full object-cover"
										loading="lazy"
									/>
								{/if}
							</div>
							<div class="mt-3 kicker text-ink-faint">{item.brand}</div>
							<div class="mt-1 font-serif text-base leading-snug">{item.name}</div>
							<div class="mt-2 font-mono text-sm">{formatPrice(item.priceCents)}</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</section>
