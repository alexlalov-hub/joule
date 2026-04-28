<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ASPECT_LABELS,
		REVIEW_ASPECTS,
		type Review,
		type ReviewSummary
	} from '$lib/reviews/types';

	type Props = {
		reviews: Review[];
		summary: ReviewSummary;
		canReview: boolean;
		alreadyReviewed: boolean;
		signedIn: boolean;
		formMessage?: string | null;
		justReviewed?: boolean;
	};

	let {
		reviews,
		summary,
		canReview,
		alreadyReviewed,
		signedIn,
		formMessage = null,
		justReviewed = false
	}: Props = $props();

	let submitting = $state(false);
	let rating = $state(5);
	let aspect = $state<(typeof REVIEW_ASPECTS)[number]>('overall');
	let title = $state('');
	let body = $state('');

	function fmtDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function stars(n: number | null): string {
		if (n === null) return '—';
		const filled = Math.round(n);
		return '★'.repeat(filled) + '☆'.repeat(Math.max(0, 5 - filled));
	}
</script>

<section class="mt-16 border-t border-ink/10 pt-12" data-testid="reviews-section">
	<div class="mb-2 kicker text-accent">Reviews</div>
	<h2 class="mb-6 font-serif text-3xl font-normal">
		{#if summary.count === 0}
			No reviews yet.
		{:else}
			{summary.count} review{summary.count === 1 ? '' : 's'}.
		{/if}
	</h2>

	{#if summary.count > 0}
		<dl
			class="mb-10 grid gap-4 rounded-sm border border-ink/10 bg-paper-warm p-5 sm:grid-cols-2 lg:grid-cols-4"
			data-testid="review-summary"
		>
			{#each REVIEW_ASPECTS as a (a)}
				<div>
					<dt class="kicker text-ink-faint">{ASPECT_LABELS[a]}</dt>
					<dd class="mt-1 font-mono text-sm">
						<span class="text-accent">{stars(summary.perAspect[a].average)}</span>
						<span class="ml-2 text-ink-faint">
							{summary.perAspect[a].average !== null
								? summary.perAspect[a].average!.toFixed(1)
								: 'No ratings'}
							{#if summary.perAspect[a].count > 0}
								<span>({summary.perAspect[a].count})</span>
							{/if}
						</span>
					</dd>
				</div>
			{/each}
		</dl>
	{/if}

	<div class="grid gap-10 lg:grid-cols-[1fr_360px]">
		<ul class="space-y-6" data-testid="review-list">
			{#each reviews as r (r.id)}
				<li class="border-b border-ink/10 pb-6 last:border-b-0" data-testid="review-item">
					<div class="flex items-baseline justify-between gap-3">
						<div class="font-medium" data-testid="review-author">{r.authorName}</div>
						<div class="font-mono text-xs text-ink-faint">{fmtDate(r.createdAt)}</div>
					</div>
					<div class="mt-1 text-sm text-ink-soft">
						<span class="text-accent" data-testid="review-rating">{stars(r.rating)}</span>
						<span class="ml-2 kicker text-ink-faint">{ASPECT_LABELS[r.aspect]}</span>
					</div>
					{#if r.title}
						<div class="mt-2 font-serif text-lg">{r.title}</div>
					{/if}
					{#if r.body}
						<p class="mt-2 leading-relaxed text-ink">{r.body}</p>
					{/if}
				</li>
			{/each}

			{#if reviews.length === 0}
				<li class="text-sm text-ink-soft">Be the first to share what you think.</li>
			{/if}
		</ul>

		<aside class="rounded-sm border border-ink/10 p-5">
			<div class="kicker text-ink-faint">Write a review</div>

			{#if !signedIn}
				<p class="mt-3 text-sm text-ink-soft">
					<a class="text-accent hover:underline" href="/login">Sign in</a>
					to share your experience with this product.
				</p>
			{:else if !canReview}
				<p class="mt-3 text-sm text-ink-soft">Reviews aren't available right now.</p>
			{:else if alreadyReviewed && !justReviewed}
				<p class="mt-3 text-sm text-ink-soft">
					Thanks — your review is in. You can post one more for a different aspect below.
				</p>
				<details class="mt-4">
					<summary class="cursor-pointer text-sm text-accent hover:underline">
						Add another aspect rating
					</summary>
					<form
						method="POST"
						action="?/postReview"
						class="mt-4 space-y-3"
						use:enhance={() => {
							submitting = true;
							return async ({ update }) => {
								await update();
								submitting = false;
								title = '';
								body = '';
							};
						}}
					>
						{@render reviewFields()}
					</form>
				</details>
			{:else}
				<form
					method="POST"
					action="?/postReview"
					class="mt-3 space-y-3"
					data-testid="review-form"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
							title = '';
							body = '';
						};
					}}
				>
					{@render reviewFields()}
				</form>
			{/if}

			{#if justReviewed}
				<p class="mt-3 text-sm text-accent" data-testid="review-success">
					Posted — thanks for the review.
				</p>
			{/if}
			{#if formMessage}
				<p class="mt-3 text-sm text-red-600" data-testid="review-error">{formMessage}</p>
			{/if}
		</aside>
	</div>
</section>

{#snippet reviewFields()}
	<label class="block text-sm">
		<span class="kicker text-ink-faint">Aspect</span>
		<select
			bind:value={aspect}
			name="aspect"
			class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm"
			data-testid="review-aspect"
		>
			{#each REVIEW_ASPECTS as a (a)}
				<option value={a}>{ASPECT_LABELS[a]}</option>
			{/each}
		</select>
	</label>

	<fieldset class="block text-sm">
		<legend class="kicker text-ink-faint">Rating</legend>
		<div class="mt-1 flex gap-2" role="radiogroup" data-testid="review-rating-input">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<label
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border text-sm transition-colors {rating ===
					n
						? 'border-accent bg-accent text-paper'
						: 'border-ink/20 hover:border-ink/40'}"
				>
					<input
						type="radio"
						name="rating"
						value={n}
						bind:group={rating}
						class="sr-only"
						data-testid="review-star-{n}"
					/>
					{n}
				</label>
			{/each}
		</div>
	</fieldset>

	<label class="block text-sm">
		<span class="kicker text-ink-faint">Headline (optional)</span>
		<input
			type="text"
			name="title"
			bind:value={title}
			maxlength="120"
			placeholder="One-line summary"
			class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm"
			data-testid="review-title"
		/>
	</label>

	<label class="block text-sm">
		<span class="kicker text-ink-faint">Your thoughts</span>
		<textarea
			name="body"
			bind:value={body}
			rows="4"
			maxlength="4000"
			placeholder="What worked, what didn't, who it suits."
			class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm"
			data-testid="review-body"
		></textarea>
	</label>

	<button
		type="submit"
		disabled={submitting}
		class="inline-flex items-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
		data-testid="review-submit"
	>
		{submitting ? 'Posting…' : 'Post review'}
	</button>
{/snippet}
