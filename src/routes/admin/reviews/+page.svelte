<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function rowError(id: string): string | null {
		if (form && 'error' in form && form.id === id && form.error) return String(form.error);
		return null;
	}

	function shortDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString();
		} catch {
			return iso.slice(0, 10);
		}
	}

	function truncate(s: string, n = 140): string {
		if (s.length <= n) return s;
		return s.slice(0, n - 1) + '…';
	}
</script>

<svelte:head>
	<title>Admin · Reviews</title>
</svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Reviews</h1>
	<p class="text-sm text-slate-500">{data.reviews.length} rows</p>
</div>

<p class="mb-4 text-sm text-slate-600">
	Hide is reversible and keeps the row in the database for audit. Delete is permanent and prompts
	for confirmation. Hidden reviews are excluded from the customer-facing product page and from
	aspect-rating averages.
</p>

<div class="mb-4 flex flex-wrap items-center gap-2 text-xs">
	<span class="text-slate-500">Show:</span>
	<a
		href="/admin/reviews"
		class="rounded px-2 py-1 {data.filter === 'all'
			? 'bg-slate-900 text-white'
			: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}"
	>
		All
	</a>
	<a
		href="/admin/reviews?filter=visible"
		class="rounded px-2 py-1 {data.filter === 'visible'
			? 'bg-slate-900 text-white'
			: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}"
	>
		Visible only
	</a>
	<a
		href="/admin/reviews?filter=hidden"
		class="rounded px-2 py-1 {data.filter === 'hidden'
			? 'bg-slate-900 text-white'
			: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}"
	>
		Hidden only
	</a>
</div>

{#if data.reviews.length === 0}
	<div class="rounded border border-slate-200 bg-white p-6 text-center text-slate-500">
		Nothing in this queue.
	</div>
{:else}
	<div class="overflow-x-auto rounded border border-slate-200 bg-white">
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
				<tr>
					<th class="px-4 py-2">Product</th>
					<th class="px-4 py-2">Rating</th>
					<th class="px-4 py-2">Review</th>
					<th class="px-4 py-2">Posted</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each data.reviews as r (r.id)}
					{@const err = rowError(r.id)}
					{@const hidden = r.hidden_at !== null}
					<tr class={hidden ? 'bg-slate-50 text-slate-600' : err ? 'bg-rose-50' : ''}>
						<td class="px-4 py-2 align-top">
							{#if r.product_slug}
								<a
									class="font-medium hover:underline"
									href={`/product/${r.product_slug}`}
									target="_blank"
									rel="noreferrer"
								>
									{r.product_name ?? r.product_slug}
								</a>
								<div class="text-xs text-slate-500">/product/{r.product_slug}</div>
							{:else}
								<span class="text-slate-500">(unknown)</span>
							{/if}
						</td>
						<td class="px-4 py-2 align-top tabular-nums">
							{r.rating}/5
							{#if r.aspect}
								<div class="text-xs text-slate-500">{r.aspect}</div>
							{/if}
						</td>
						<td class="px-4 py-2 align-top">
							<div class="font-medium">{r.title || '(no title)'}</div>
							<div class="text-xs text-slate-600">{truncate(r.body)}</div>
						</td>
						<td class="px-4 py-2 align-top text-xs text-slate-500">
							{shortDate(r.created_at)}
						</td>
						<td class="px-4 py-2 align-top text-xs">
							{#if hidden}
								<span
									class="rounded bg-slate-200 px-2 py-0.5 font-medium tracking-wide text-slate-700 uppercase"
								>
									Hidden
								</span>
								<div class="mt-1 text-[10px] text-slate-500">since {shortDate(r.hidden_at!)}</div>
							{:else}
								<span
									class="rounded bg-emerald-100 px-2 py-0.5 font-medium tracking-wide text-emerald-900 uppercase"
								>
									Visible
								</span>
							{/if}
						</td>
						<td class="px-4 py-2 align-top">
							<div class="flex items-center justify-end gap-1">
								<form method="POST" action={hidden ? '?/show' : '?/hide'} use:enhance>
									<input type="hidden" name="id" value={r.id} />
									<button
										type="submit"
										class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
									>
										{hidden ? 'Show' : 'Hide'}
									</button>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance
									onsubmit={(event) => {
										if (!confirm('Permanently delete this review? This cannot be undone.')) {
											event.preventDefault();
										}
									}}
								>
									<input type="hidden" name="id" value={r.id} />
									<button
										type="submit"
										class="rounded border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
									>
										Delete
									</button>
								</form>
							</div>
						</td>
					</tr>
					{#if err}
						<tr class="bg-rose-50">
							<td colspan="6" class="px-4 py-1 text-xs text-rose-800">{err}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
