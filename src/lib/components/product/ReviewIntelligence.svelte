<script lang="ts">
	type Props = {
		productSlug: string;
		reviewCount: number;
	};

	let { productSlug, reviewCount }: Props = $props();

	let expanded = $state(false);
	let summary = $state('');
	let status = $state<'idle' | 'streaming' | 'done' | 'error'>('idle');
	let errorMessage = $state<string | null>(null);
	let abortCtrl: AbortController | null = null;

	async function streamSummary() {
		if (status === 'streaming') return;
		status = 'streaming';
		errorMessage = null;
		summary = '';

		abortCtrl?.abort();
		abortCtrl = new AbortController();
		try {
			const res = await fetch('/api/review-intelligence', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ slug: productSlug }),
				signal: abortCtrl.signal
			});
			if (!res.ok || !res.body) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `Summary failed (${res.status})`);
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				summary += decoder.decode(value, { stream: true });
			}
			status = 'done';
		} catch (e: unknown) {
			if (abortCtrl?.signal.aborted) return;
			status = 'error';
			errorMessage = e instanceof Error ? e.message : 'Summary failed';
		}
	}

	function toggle() {
		expanded = !expanded;
		if (expanded && status === 'idle') {
			void streamSummary();
		}
	}

	function scrollToReview(num: number, _e: MouseEvent) {
		const el = document.querySelector(`[data-review-number="${num}"]`);
		if (el instanceof HTMLElement) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.add('outline', 'outline-2', 'outline-accent');
			setTimeout(() => el.classList.remove('outline', 'outline-2', 'outline-accent'), 1200);
		}
	}

	type Segment = { kind: 'text'; value: string } | { kind: 'cite'; refs: number[]; raw: string };

	function segments(text: string): Segment[] {
		const out: Segment[] = [];
		// Match [1], [1, 2], [1,2,3] — citations only, not arbitrary [text].
		const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
			const refs = m[1]
				.split(',')
				.map((s) => Number(s.trim()))
				.filter((n) => Number.isFinite(n) && n > 0);
			out.push({ kind: 'cite', refs, raw: m[0] });
			last = m.index + m[0].length;
		}
		if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
		return out;
	}
</script>

<section
	class="mb-10 rounded-sm border border-accent/30 bg-paper-warm p-5"
	data-testid="review-intelligence"
>
	<div class="flex items-start justify-between gap-4">
		<div>
			<div class="kicker text-accent">What reviewers say</div>
			<p class="mt-1 text-sm text-ink-soft">
				Themes pulled from the {reviewCount} reviews on this product, with citations.
			</p>
		</div>
		<button
			type="button"
			onclick={toggle}
			data-testid="review-intelligence-toggle"
			aria-expanded={expanded}
			class="shrink-0 rounded-sm border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
		>
			{expanded ? 'Hide' : 'Read the gist'}
		</button>
	</div>

	{#if expanded}
		<div class="mt-5 border-t border-ink/10 pt-5">
			{#if status === 'streaming' && summary.length === 0}
				<p
					class="font-mono text-xs tracking-wider text-ink-faint"
					data-testid="review-intelligence-loading"
				>
					Reading the reviews…
				</p>
			{/if}

			<div
				class="leading-relaxed whitespace-pre-wrap text-ink"
				data-testid="review-intelligence-output"
			>
				{#each segments(summary) as seg, i (i)}
					{#if seg.kind === 'cite'}
						<span class="inline-flex items-center gap-1 align-baseline">
							{#each seg.refs as n, j (j)}
								<button
									type="button"
									onclick={(e) => scrollToReview(n, e)}
									class="cursor-pointer rounded-sm border border-accent/40 px-1.5 py-px font-mono text-[11px] text-accent hover:bg-accent hover:text-paper"
									data-testid="review-intelligence-cite"
								>
									#{n}
								</button>
							{/each}
						</span>
					{:else}
						{seg.value}
					{/if}
				{/each}
			</div>

			{#if status === 'streaming'}
				<p class="mt-3 font-mono text-xs tracking-wider text-ink-faint">Writing…</p>
			{/if}
			{#if status === 'error'}
				<p
					class="mt-3 rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700"
					data-testid="review-intelligence-error"
				>
					{errorMessage ?? 'Summary failed'}
				</p>
			{/if}
		</div>
	{/if}
</section>
