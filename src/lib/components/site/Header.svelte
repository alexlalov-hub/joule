<script lang="ts">
	import type { User } from '@supabase/supabase-js';

	let { user, cartCount = 0 }: { user: User | null; cartCount?: number } = $props();
</script>

<header
	class="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/75"
>
	<div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-10">
		<a href="/" class="font-serif text-xl font-medium tracking-tight">
			Jo<span class="text-accent italic">ule</span>
		</a>

		<nav class="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
			<a href="/categories" class="transition-colors hover:text-accent">Categories</a>
			<a href="/search" class="transition-colors hover:text-accent">Search</a>
			<a href="/category/laptops" class="transition-colors hover:text-accent">Laptops</a>
			<a href="/category/headphones" class="transition-colors hover:text-accent">Audio</a>
			<a href="/category/smartphones" class="transition-colors hover:text-accent">Phones</a>
		</nav>

		<div class="flex items-center gap-4 text-sm">
			<a href="/search" aria-label="Search" class="text-ink-soft hover:text-accent">
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m21 21-4.3-4.3" stroke-linecap="round" />
				</svg>
			</a>
			<a
				href="/cart"
				aria-label="Cart ({cartCount} items)"
				class="relative text-ink-soft hover:text-accent"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
				>
					<path
						d="M3 5h2l2.6 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 9H6"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
					<circle cx="10" cy="21" r="1.2" />
					<circle cx="18" cy="21" r="1.2" />
				</svg>
				{#if cartCount > 0}
					<span
						class="absolute -top-2 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-medium text-paper"
						data-testid="cart-count"
					>
						{cartCount}
					</span>
				{/if}
			</a>
			{#if user}
				<a href="/account" class="hidden text-ink-soft hover:text-accent sm:inline">Account</a>
			{:else}
				<a
					href="/login"
					class="inline-flex items-center rounded-sm border border-ink px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
				>
					Sign in
				</a>
			{/if}
		</div>
	</div>
</header>
