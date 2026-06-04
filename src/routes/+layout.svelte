<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/site/Header.svelte';
	import Footer from '$lib/components/site/Footer.svelte';
	import CompareTray from '$lib/components/compare/CompareTray.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import type { User } from '@supabase/supabase-js';

	let { children } = $props();

	// Header personalisation lives in client state, not in SSR. Why: the
	// catalog routes set `Cache-Control: public, s-maxage=...` so Vercel
	// caches the SSR HTML and serves the same bytes to every visitor —
	// any user-specific value in the rendered output would leak across
	// sessions. SSR renders the header anonymous; this state gets
	// hydrated from `/api/me` after mount and re-renders the header
	// with the user's data.
	let user = $state<User | null>(null);
	let cartCount = $state(0);

	onMount(async () => {
		try {
			const res = await fetch('/api/me');
			if (!res.ok) return;
			const me = await res.json();
			user = me.user;
			cartCount = me.cartCount ?? 0;
		} catch {
			// Silent — anonymous state is the safe fallback.
		}
	});

	// Two observability layers, both Vercel-native and free at this scale:
	//   - Vercel Analytics       : page-view counts, top referrers,
	//                              geography. Privacy-friendly, no cookies.
	//   - Vercel Speed Insights  : real-user Web Vitals per route. Lets us
	//                              answer "is /product/<slug> slow on
	//                              mobile" without synthetic tests.
	// Both inject only in the browser; the SDK helpers handle that internally.
	injectAnalytics();
	injectSpeedInsights();

	// /admin/* has its own header, footer, and styling — skip the customer
	// chrome so it isn't stacked on top. Same idea as a "bare" layout reset,
	// done conditionally so we don't need a parallel route tree.
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

{#if isAdmin}
	{@render children()}
{:else}
	<div class="flex min-h-screen flex-col">
		<Header {user} {cartCount} />
		<main class="flex-1">
			{@render children()}
		</main>
		<Footer />
	</div>

	<CompareTray />
{/if}
