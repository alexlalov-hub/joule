<script lang="ts">
	import { formatPrice } from '$lib/catalog/types';

	let { data } = $props();

	let verdict = $state('');
	let verdictStatus = $state<'idle' | 'streaming' | 'done' | 'error'>('idle');
	let verdictError = $state<string | null>(null);

	const slugsKey = $derived(data.products.map((p) => p.slug).join(','));

	$effect(() => {
		if (!data.canStreamVerdict) return;
		// Re-run whenever the slugs list changes (e.g. user removed a product).
		void slugsKey;
		verdict = '';
		verdictError = null;
		verdictStatus = 'streaming';
		const ctrl = new AbortController();
		streamVerdict(
			data.products.map((p) => p.slug),
			ctrl.signal
		)
			.then(() => {
				verdictStatus = 'done';
			})
			.catch((e: unknown) => {
				if (ctrl.signal.aborted) return;
				verdictStatus = 'error';
				verdictError = e instanceof Error ? e.message : 'Failed to stream verdict';
			});
		return () => ctrl.abort();
	});

	async function streamVerdict(slugs: string[], signal: AbortSignal) {
		const res = await fetch('/api/compare', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ slugs }),
			signal
		});
		if (!res.ok || !res.body) {
			const text = await res.text().catch(() => '');
			throw new Error(text || `Verdict failed (${res.status})`);
		}
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			verdict += decoder.decode(value, { stream: true });
		}
	}

	function removeHref(slug: string): string {
		const remaining = data.products.map((p) => p.slug).filter((s) => s !== slug);
		if (remaining.length === 0) return '/categories';
		return `/compare?slugs=${remaining.join(',')}`;
	}

	type Segment = { kind: 'text'; value: string } | { kind: 'slug'; value: string };

	function segments(text: string): Segment[] {
		const out: Segment[] = [];
		const re = /\[([a-z0-9][a-z0-9-]{1,80})\]/gi;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
			out.push({ kind: 'slug', value: m[1].toLowerCase() });
			last = m.index + m[0].length;
		}
		if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
		return out;
	}
</script>

<svelte:head>
	<title>
		{data.products.length === 0
			? 'Compare products'
			: `Compare: ${data.products.map((p) => p.name).join(' vs ')}`} — Joule
	</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
	<div class="kicker text-accent">Compare</div>
	<h1 class="mt-2 font-serif text-4xl font-normal md:text-5xl">
		{#if data.products.length === 0}
			Pick products to compare.
		{:else if data.products.length === 1}
			Add one more to compare.
		{:else}
			Side by side, <em class="text-accent italic">spec for spec.</em>
		{/if}
	</h1>

	{#if data.missing.length > 0}
		<p class="mt-3 text-sm text-red-600" data-testid="compare-missing">
			Could not find: {data.missing.join(', ')}
		</p>
	{/if}

	{#if data.crossCategory}
		<p
			class="mt-4 max-w-prose rounded-sm border border-accent/30 bg-paper-warm p-4 text-sm text-ink"
			data-testid="compare-cross-category"
		>
			You're comparing products from different departments ({data.categories.join(', ')}). They
			don't really compete — they complement each other. The spec table is below for reference, but
			a "which one" verdict wouldn't be useful here.
		</p>
	{/if}

	{#if data.products.length === 0}
		<p class="mt-6 max-w-prose text-ink-soft">
			Open this page with up to three product slugs in the URL — for example,
			<a class="font-mono text-accent hover:underline" href="/compare?slugs=macbook-air-m4-13"
				>?slugs=slug-a,slug-b,slug-c</a
			>. Or
			<a class="text-accent hover:underline" href="/categories">browse the catalog</a>
			and add products to your comparison from any product page.
		</p>
	{:else}
		<div class="mt-10 overflow-x-auto" data-testid="compare-grid">
			<table class="min-w-full border-separate border-spacing-0">
				<thead>
					<tr>
						<th class="w-40 border-b border-ink/10 py-3 text-left kicker text-ink-faint"> Spec </th>
						{#each data.products as p (p.slug)}
							<th class="border-b border-ink/10 py-3 pr-6 text-left">
								<div class="kicker text-accent">{p.brand}</div>
								<a
									href="/product/{p.slug}"
									class="block font-serif text-lg font-medium hover:underline"
									data-testid="compare-product-name"
								>
									{p.name}
								</a>
								<div class="mt-1 font-mono text-sm text-ink-soft">
									{formatPrice(p.priceCents)}
								</div>
								{#if data.products.length > 1}
									<a
										href={removeHref(p.slug)}
										class="mt-2 inline-block font-mono text-[11px] text-ink-faint hover:text-accent"
										data-testid="compare-remove"
									>
										✕ remove
									</a>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.rows as row (row.label)}
						<tr class="align-top">
							<td
								class="border-b border-ink/5 py-3 pr-6 font-mono text-xs tracking-wider text-ink-faint uppercase"
								>{row.label}</td
							>
							{#each row.values as value, i (i)}
								<td class="border-b border-ink/5 py-3 pr-6 text-sm text-ink">
									{value}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if data.canStreamVerdict}
			<section
				class="mt-12 rounded-sm border border-accent/30 bg-paper p-6"
				data-testid="compare-verdict"
			>
				<div class="kicker text-accent">The take</div>
				<h2 class="mt-2 font-serif text-2xl font-normal">Which one, and why</h2>

				{#if verdictStatus === 'streaming' && verdict.length === 0}
					<p
						class="mt-4 font-mono text-xs tracking-wider text-ink-faint"
						data-testid="compare-verdict-loading"
					>
						Reading the specs…
					</p>
				{/if}

				<div class="prose-ink prose mt-4 max-w-none leading-relaxed whitespace-pre-wrap">
					{#each segments(verdict) as seg, i (i)}
						{#if seg.kind === 'slug'}
							<a
								href="/product/{seg.value}"
								class="font-mono text-sm text-accent hover:underline"
								data-testid="compare-slug-link">{seg.value}</a
							>
						{:else}
							{seg.value}
						{/if}
					{/each}
				</div>

				{#if verdictStatus === 'streaming'}
					<p class="mt-3 font-mono text-xs tracking-wider text-ink-faint">Writing…</p>
				{/if}
				{#if verdictStatus === 'error'}
					<p
						class="mt-3 rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700"
						data-testid="compare-verdict-error"
					>
						{verdictError ?? 'Something went wrong'}
					</p>
				{/if}
			</section>
		{:else if !data.crossCategory}
			<p class="mt-8 text-sm text-ink-soft">
				Add at least one more product to get a written comparison.
			</p>
		{/if}
	{/if}
</section>
