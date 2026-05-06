<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';

	const chat = new Chat({
		transport: new DefaultChatTransport({ api: '/api/assistant' })
	});

	let input = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);

	const isStreaming = $derived(chat.status === 'submitted' || chat.status === 'streaming');
	const hasMessages = $derived(chat.messages.length > 0);

	$effect(() => {
		// Re-track on every message-list mutation so we scroll while tokens arrive.
		void chat.messages.length;
		void chat.messages.at(-1)?.parts.length;
		queueMicrotask(() => {
			if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
		});
	});

	function submit(e: Event) {
		e.preventDefault();
		const text = input.trim();
		if (!text || isStreaming) return;
		input = '';
		chat.sendMessage({ text });
	}

	function clearChat() {
		chat.messages = [];
	}

	const SUGGESTIONS = [
		'A lightweight laptop for travel under €1500',
		'Headphones for the office — must be wired',
		"What's the best phone for camera quality?",
		'Compare the MacBook Air to the Dell XPS 13'
	];

	function ask(s: string) {
		if (isStreaming) return;
		chat.sendMessage({ text: s });
	}

	type TextSegment = { kind: 'text'; value: string } | { kind: 'slug'; value: string };

	function segmentsForText(text: string): TextSegment[] {
		const out: TextSegment[] = [];
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

	function toolDisplayName(typeStr: string): string {
		// type === "tool-search_catalog" etc. Strip the "tool-" prefix.
		return typeStr.startsWith('tool-') ? typeStr.slice(5) : typeStr;
	}
</script>

<svelte:head>
	<title>Shopping assistant — Joule</title>
</svelte:head>

<section class="mx-auto flex max-w-3xl flex-col px-6 pt-12 pb-24 md:px-10">
	<div class="kicker text-accent">Assistant</div>
	<h1 class="mt-2 font-serif text-4xl font-normal md:text-5xl">
		Tell me what you're <em class="text-accent italic">looking for.</em>
	</h1>
	<p class="mt-3 max-w-prose font-serif text-lg text-ink-soft italic">
		The assistant only recommends from Joule's catalog and cites real specs. It will never invent a
		product.
	</p>

	{#if !hasMessages}
		<ul class="mt-8 grid gap-2 sm:grid-cols-2" data-testid="assistant-suggestions">
			{#each SUGGESTIONS as s (s)}
				<li>
					<button
						type="button"
						onclick={() => ask(s)}
						class="w-full rounded-sm border border-ink/15 bg-paper-warm px-4 py-3 text-left text-sm leading-snug text-ink-soft transition-colors hover:border-accent hover:text-ink"
					>
						{s}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div
		bind:this={scrollEl}
		class="mt-10 max-h-[60vh] space-y-6 overflow-y-auto pr-1"
		data-testid="assistant-messages"
	>
		{#each chat.messages as m (m.id)}
			<article
				class="rounded-sm border p-4 {m.role === 'user'
					? 'border-ink/10 bg-paper-warm'
					: 'border-accent/30 bg-paper'}"
				data-testid="assistant-message"
				data-role={m.role}
			>
				<div class="mb-2 kicker text-ink-faint">
					{m.role === 'user' ? 'You' : 'Assistant'}
				</div>
				<div class="space-y-2 leading-relaxed">
					{#each m.parts as part, i (i)}
						{#if part.type === 'text'}
							<p class="whitespace-pre-wrap">
								{#each segmentsForText(part.text) as seg, j (j)}
									{#if seg.kind === 'slug'}
										<a
											href="/product/{seg.value}"
											class="font-mono text-sm text-accent hover:underline"
											data-testid="assistant-slug-link">{seg.value}</a
										>
									{:else}
										{seg.value}
									{/if}
								{/each}
							</p>
						{:else if part.type.startsWith('tool-')}
							<div
								class="inline-flex items-center gap-2 rounded-sm border border-ink/10 bg-paper-warm px-2 py-1 font-mono text-xs text-ink-faint"
								data-testid="assistant-tool"
							>
								<span class="text-accent">⚙</span>
								{toolDisplayName(part.type)}
								{#if 'state' in part && part.state === 'output-available'}
									<span class="text-ink-faint">· done</span>
								{:else if 'state' in part && part.state === 'input-streaming'}
									<span class="text-ink-faint">· thinking…</span>
								{:else if 'state' in part && part.state === 'input-available'}
									<span class="text-ink-faint">· running…</span>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</article>
		{/each}

		{#if isStreaming}
			<p class="font-mono text-xs tracking-wider text-ink-faint" data-testid="assistant-streaming">
				{chat.status === 'submitted' ? 'Thinking…' : 'Writing…'}
			</p>
		{/if}

		{#if chat.error}
			<p
				class="rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700"
				data-testid="assistant-error"
			>
				{chat.error.message}
			</p>
		{/if}
	</div>

	<form
		onsubmit={submit}
		class="sticky bottom-4 mt-8 flex gap-2 rounded-sm border border-ink/20 bg-paper p-2 shadow-sm"
	>
		<label class="flex-1">
			<span class="sr-only">Message</span>
			<input
				type="text"
				bind:value={input}
				placeholder="Ask for a recommendation, comparison, or spec…"
				disabled={isStreaming}
				class="w-full bg-transparent px-3 py-2 text-base focus:outline-none disabled:opacity-50"
				data-testid="assistant-input"
				autocomplete="off"
			/>
		</label>
		{#if hasMessages}
			<button
				type="button"
				onclick={clearChat}
				disabled={isStreaming}
				class="rounded-sm border border-ink/15 px-3 text-xs text-ink-soft hover:border-ink/40 disabled:opacity-50"
			>
				Clear
			</button>
		{/if}
		<button
			type="submit"
			disabled={isStreaming || !input.trim()}
			class="rounded-sm bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
			data-testid="assistant-send"
		>
			{isStreaming ? '…' : 'Send'}
		</button>
	</form>
</section>
