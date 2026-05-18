<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function poundsFromCents(cents: number): string {
		return (cents / 100).toFixed(2);
	}

	// Per-row "saved a moment ago" flag — flipped on by the successful action
	// response and cleared by a tiny timeout. Pure visual feedback.
	let savedIds = $state<Record<string, number>>({});
	function flashSaved(id: string) {
		const stamp = Date.now();
		savedIds = { ...savedIds, [id]: stamp };
		setTimeout(() => {
			if (savedIds[id] === stamp) {
				const next = { ...savedIds };
				delete next[id];
				savedIds = next;
			}
		}, 2000);
	}

	function rowError(id: string): string | null {
		if (form && 'error' in form && form.id === id && form.error) return String(form.error);
		return null;
	}
</script>

<svelte:head>
	<title>Admin · Products</title>
</svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Products</h1>
	<p class="text-sm text-slate-500">{data.products.length} rows</p>
</div>

<p class="mb-6 text-sm text-slate-600">
	Edit a product's price, stock, or featured flag inline. Changes apply to the public storefront on
	the next page load.
</p>

{#if data.products.length === 0}
	<div class="rounded border border-slate-200 bg-white p-6 text-center text-slate-500">
		No products yet. Seed the catalog first.
	</div>
{:else}
	<div class="overflow-x-auto rounded border border-slate-200 bg-white">
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
				<tr>
					<th class="px-4 py-2">Product</th>
					<th class="px-4 py-2">Brand</th>
					<th class="px-4 py-2">Category</th>
					<th class="px-4 py-2 text-right">Price (£) and stock</th>
					<th class="px-4 py-2 text-center">Featured</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each data.products as p (p.id)}
					{@const err = rowError(p.id)}
					<tr class={err ? 'bg-rose-50' : ''}>
						<td class="px-4 py-2">
							<div class="font-medium">{p.name}</div>
							<a class="text-xs text-slate-500 hover:underline" href={`/product/${p.slug}`}
								>/product/{p.slug}</a
							>
						</td>
						<td class="px-4 py-2 text-slate-700">{p.brand}</td>
						<td class="px-4 py-2 text-slate-700">{p.category_name ?? '—'}</td>
						<td class="px-4 py-2">
							<form
								method="POST"
								action="?/update"
								class="flex items-center justify-end gap-2"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') flashSaved(p.id);
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={p.id} />
								<label class="flex items-center gap-1 text-xs text-slate-500">
									£
									<input
										name="price"
										type="number"
										step="0.01"
										min="0"
										max="100000"
										value={poundsFromCents(p.price_cents)}
										class="w-24 rounded border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-slate-500 focus:outline-none"
									/>
								</label>
								<label class="flex items-center gap-1 text-xs text-slate-500">
									stock
									<input
										name="stock"
										type="number"
										step="1"
										min="0"
										value={p.stock_qty}
										class="w-20 rounded border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-slate-500 focus:outline-none"
									/>
								</label>
								<button
									type="submit"
									class="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
								>
									Save
								</button>
								{#if savedIds[p.id]}
									<span class="text-xs text-emerald-700">Saved</span>
								{/if}
							</form>
						</td>
						<td class="px-4 py-2 text-center">
							<form
								method="POST"
								action="?/toggleFeatured"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') flashSaved(p.id);
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={p.id} />
								<input type="hidden" name="next" value={String(!p.featured)} />
								<button
									type="submit"
									class="rounded border px-3 py-1 text-xs font-medium {p.featured
										? 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
										: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}"
								>
									{p.featured ? 'Featured' : 'Off'}
								</button>
							</form>
						</td>
					</tr>
					{#if err}
						<tr class="bg-rose-50">
							<td colspan="5" class="px-4 py-1 text-xs text-rose-800">{err}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
