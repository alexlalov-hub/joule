<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Account — TechnoMarket</title></svelte:head>

<section class="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
	<div class="kicker text-accent">Account</div>
	<h1 class="mt-2 font-serif text-4xl font-normal">Welcome back.</h1>
	<p class="mt-4 font-serif text-lg text-ink-soft">
		You are signed in as <span class="text-ink">{data.user.email}</span>.
	</p>

	<div
		class="mt-10 rounded border border-ink/10 bg-white/60 p-6 text-sm leading-relaxed text-ink-soft"
	>
		<p class="font-medium text-ink">Coming in week 2</p>
		<ul class="mt-3 list-disc space-y-1 pl-5">
			<li>Order history</li>
			<li>Saved addresses</li>
			<li>Wishlist</li>
			<li>Profile editing</li>
		</ul>
	</div>

	<form method="POST" action="/logout" class="mt-10">
		<button
			type="submit"
			class="cursor-pointer text-sm text-ink-soft underline underline-offset-4 hover:text-accent"
		>
			Sign out
		</button>
	</form>
</section>
