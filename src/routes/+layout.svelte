<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Header from '$lib/components/site/Header.svelte';
	import Footer from '$lib/components/site/Footer.svelte';
	import CompareTray from '$lib/components/compare/CompareTray.svelte';

	let { data, children } = $props();

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
