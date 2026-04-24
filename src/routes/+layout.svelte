<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/site/Header.svelte';
	import Footer from '$lib/components/site/Footer.svelte';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<Header user={data.user} cartCount={data.cartCount} />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
