<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatPrice } from '$lib/catalog/types';

	let { data } = $props();
	const cart = $derived(data.cart);
	const isEmpty = $derived(cart.items.length === 0);
</script>

<svelte:head>
	<title>Cart — TechnoMarket</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
	<div class="mb-8 flex items-baseline justify-between gap-4">
		<div>
			<div class="kicker text-accent">Your cart</div>
			<h1 class="mt-1 font-serif text-4xl font-normal">
				{#if isEmpty}
					Nothing here yet.
				{:else}
					{cart.itemCount}
					{cart.itemCount === 1 ? 'item' : 'items'}.
				{/if}
			</h1>
		</div>
		{#if !isEmpty}
			<form method="POST" action="?/clear" use:enhance>
				<button
					type="submit"
					class="font-mono text-xs tracking-widest text-ink-faint uppercase hover:text-accent"
				>
					Clear cart
				</button>
			</form>
		{/if}
	</div>

	{#if isEmpty}
		<div class="rounded-sm border border-ink/10 bg-paper-warm p-10 text-center">
			<p class="mb-6 font-serif text-xl text-ink-soft italic">
				Your cart is empty — browse the catalog to add something.
			</p>
			<a
				href="/categories"
				class="inline-flex items-center rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
			>
				Shop categories
			</a>
		</div>
	{:else}
		<div class="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
			<ul class="divide-y divide-ink/10 border-y border-ink/10" data-testid="cart-items">
				{#each cart.items as item (item.itemId)}
					<li class="flex gap-5 py-5" data-testid="cart-item">
						<a href="/product/{item.slug}" class="shrink-0">
							<div class="aspect-[4/3] w-28 overflow-hidden rounded-sm bg-paper-warm">
								{#if item.image}
									<img
										src={item.image}
										alt={item.name}
										class="h-full w-full object-cover"
										loading="lazy"
									/>
								{/if}
							</div>
						</a>
						<div class="flex flex-1 flex-col">
							<div class="flex items-start justify-between gap-4">
								<div>
									<div class="kicker text-ink-faint">{item.brand}</div>
									<a
										href="/product/{item.slug}"
										class="mt-1 block font-serif text-lg leading-snug hover:text-accent"
									>
										{item.name}
									</a>
								</div>
								<div class="font-serif text-lg font-medium whitespace-nowrap">
									{formatPrice(item.priceCents * item.quantity)}
								</div>
							</div>

							<div class="mt-auto flex items-center justify-between pt-4">
								<form
									method="POST"
									action="?/updateQty"
									use:enhance
									class="flex items-center gap-2"
								>
									<input type="hidden" name="itemId" value={item.itemId} />
									<label class="sr-only" for="qty-{item.itemId}">Quantity</label>
									<select
										id="qty-{item.itemId}"
										name="quantity"
										class="rounded-sm border border-ink/20 bg-paper px-2 py-1 font-mono text-sm focus:border-accent focus:outline-none"
										data-testid="cart-qty"
										onchange={(e) => {
											(e.currentTarget.form as HTMLFormElement).requestSubmit();
										}}
									>
										{#each Array.from({ length: Math.max(item.stockQty, item.quantity) }, (_, i) => i + 1) as n}
											<option value={n} selected={n === item.quantity}>{n}</option>
										{/each}
									</select>
									<span class="font-mono text-xs text-ink-faint">
										× {formatPrice(item.priceCents)}
									</span>
								</form>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="itemId" value={item.itemId} />
									<button
										type="submit"
										class="font-mono text-xs tracking-widest text-ink-faint uppercase hover:text-accent"
										data-testid="cart-remove"
									>
										Remove
									</button>
								</form>
							</div>
						</div>
					</li>
				{/each}
			</ul>

			<aside class="h-fit rounded-sm border border-ink/10 bg-paper-warm p-6">
				<div class="kicker text-ink-faint">Summary</div>
				<dl class="mt-4 space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-ink-soft">Subtotal</dt>
						<dd class="font-mono" data-testid="cart-subtotal">
							{formatPrice(cart.subtotalCents)}
						</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-ink-soft">Shipping</dt>
						<dd class="font-mono text-ink-faint">Calculated at checkout</dd>
					</div>
				</dl>
				<div class="mt-6 flex justify-between border-t border-ink/10 pt-4">
					<span class="font-serif text-lg">Total</span>
					<span class="font-serif text-lg font-medium" data-testid="cart-total">
						{formatPrice(cart.subtotalCents)}
					</span>
				</div>
				<form method="POST" action="/checkout" use:enhance class="mt-6">
					<button
						type="submit"
						class="w-full rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
						data-testid="checkout"
					>
						Checkout
					</button>
				</form>
				<p class="mt-3 font-mono text-[11px] tracking-wider text-ink-faint uppercase">
					Secure payment via Stripe
				</p>
			</aside>
		</div>
	{/if}
</section>
