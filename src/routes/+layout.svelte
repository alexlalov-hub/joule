<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Header from '$lib/components/site/Header.svelte';
	import Footer from '$lib/components/site/Footer.svelte';
	import CompareTray from '$lib/components/compare/CompareTray.svelte';
	import posthog from 'posthog-js';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { data, children } = $props();

	// Three observability layers, all running together because they answer
	// different questions and don't overlap:
	//   - PostHog                : product analytics — pageviews + custom
	//                              events (cart add, review post, AI ask).
	//                              Lets us answer "what do users do".
	//   - Vercel Analytics        : page-view counts, top referrers,
	//                              geography. Privacy-friendly, no cookies.
	//                              Lets us answer "where does traffic come
	//                              from".
	//   - Vercel Speed Insights   : real-user Web Vitals per route. Lets us
	//                              answer "is /product/<slug> slow on
	//                              mobile" without synthetic tests.
	// All three init only in the browser (server-side rendering doesn't
	// fire them); the inject* helpers from the Vercel SDKs already handle
	// that internally.
	injectAnalytics();
	injectSpeedInsights();

	afterNavigate(() => posthog.capture('$pageview'));

	// /admin/* has its own header, footer, and styling — skip the customer
	// chrome so it isn't stacked on top. Same idea as a "bare" layout reset,
	// done conditionally so we don't need a parallel route tree.
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

{#if isAdmin}
	{@render children()}
{:else}
	<div class="flex min-h-screen flex-col">
		<Header user={data.user} cartCount={data.cartCount} />
		<main class="flex-1">
			{@render children()}
		</main>
		<Footer />
	</div>

	<CompareTray />
{/if}
