<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>All categories — TechnoMarket</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
	<div class="kicker text-accent">Departments</div>
	<h1 class="mt-2 font-serif text-5xl font-normal">All categories.</h1>
	<p class="mt-3 max-w-xl font-serif text-lg text-ink-soft italic">
		Eighteen departments, curated. Faceted search arrives in week 2.
	</p>

	<ul class="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.categories as c (c.slug)}
			<li>
				<a
					href="/category/{c.slug}"
					class="group flex items-start justify-between rounded-sm border border-ink/10 p-5 transition-colors hover:border-accent"
				>
					<div>
						<div class="font-serif text-xl font-medium">{c.name}</div>
						<p class="mt-1 text-sm text-ink-soft">{c.blurb}</p>
					</div>
					<span class="font-mono text-xs text-ink-faint">{data.counts[c.slug] ?? 0}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>
