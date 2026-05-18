<script lang="ts">
	let { data } = $props();

	// $derived so a load re-run after a form action updates the counts.
	const cards = $derived([
		{ label: 'Total products', value: data.total, href: '/admin/products' },
		{ label: 'Featured', value: data.featured, href: '/admin/products?filter=featured' },
		{ label: 'Low stock (< 5)', value: data.lowStock, href: '/admin/products?filter=low-stock' }
	]);
</script>

<svelte:head>
	<title>Admin · Dashboard</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Dashboard</h1>

<p class="mb-6 text-sm text-slate-600">
	Three numbers worth glancing at. Click through to the product list to act on any of them.
</p>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
	{#each cards as card (card.label)}
		<a
			href={card.href}
			class="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
		>
			<div class="text-3xl font-semibold tabular-nums">{card.value}</div>
			<div class="mt-1 text-sm text-slate-600">{card.label}</div>
		</a>
	{/each}
</div>
