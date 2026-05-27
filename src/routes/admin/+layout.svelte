<script lang="ts">
	// Admin shell. Deliberately separate from the customer Header / Footer
	// because the admin UI isn't a place to browse the catalog — it's a place
	// to operate the catalog. Reusing the customer header would put a cart
	// icon and a "search products" box on every admin page, which is noise.

	import { page } from '$app/state';

	let { data, children } = $props();

	const navLinks = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/products', label: 'Products' },
		{ href: '/admin/reviews', label: 'Reviews' }
	];
</script>

<div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				<a href="/admin" class="text-lg font-semibold">Joule</a>
				<span
					class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium tracking-wide text-amber-900 uppercase"
				>
					Admin
				</span>
			</div>
			<nav class="flex items-center gap-1 text-sm">
				{#each navLinks as link (link.href)}
					{@const active =
						link.href === '/admin'
							? page.url.pathname === '/admin'
							: page.url.pathname.startsWith(link.href)}
					<a
						href={link.href}
						class="rounded px-3 py-1.5 {active
							? 'bg-slate-900 text-white'
							: 'text-slate-700 hover:bg-slate-100'}"
					>
						{link.label}
					</a>
				{/each}
				<span class="ml-3 text-xs text-slate-500">{data.adminUser?.email ?? ''}</span>
				<a href="/" class="ml-2 rounded px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
					>Exit</a
				>
			</nav>
		</div>
	</header>
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
		{@render children()}
	</main>
</div>
