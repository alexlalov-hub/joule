<script lang="ts">
	let { data } = $props();
	const order = $derived(data.order);
</script>

<svelte:head>
	<title>Order confirmed — TechnoMarket</title>
</svelte:head>

<section class="mx-auto max-w-2xl px-6 py-20 text-center md:px-10">
	<div class="kicker text-accent">Order confirmed</div>
	<h1 class="mt-3 font-serif text-4xl font-normal">Thank you — payment received.</h1>
	<p class="mt-4 font-serif text-xl text-ink-soft italic">A receipt is on its way to your inbox.</p>

	{#if order?.id}
		<p class="mt-8 font-mono text-xs tracking-widest text-ink-faint uppercase">
			Order <span class="text-ink">{order.id.slice(0, 8)}</span>
			· {new Intl.NumberFormat('en-IE', {
				style: 'currency',
				currency: order.currency
			}).format(order.total / 100)}
		</p>
	{/if}

	<div class="mt-10 flex justify-center gap-3">
		<a
			href="/account"
			class="inline-flex items-center rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
		>
			View my orders
		</a>
		<a
			href="/categories"
			class="inline-flex items-center rounded-sm border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
		>
			Keep shopping
		</a>
	</div>
</section>
