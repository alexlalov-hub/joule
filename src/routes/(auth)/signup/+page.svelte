<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Create account — Joule</title></svelte:head>

<section class="mx-auto max-w-md px-6 py-16 md:py-24">
	<div class="kicker text-accent">Account</div>
	<h1 class="mt-2 font-serif text-4xl font-normal">Create an account.</h1>
	<p class="mt-2 font-serif text-ink-soft italic">
		Carts and wishlists sync across devices once you're signed in.
	</p>

	{#if form?.message}
		<div
			class="mt-6 rounded-sm border border-accent/30 bg-accent/5 px-4 py-3 text-sm"
			role="status"
		>
			{form.message}
		</div>
	{/if}
	{#if form?.error}
		<div
			class="mt-6 rounded-sm border border-accent/50 bg-accent/10 px-4 py-3 text-sm text-accent-deep"
			role="alert"
		>
			{form.error}
		</div>
	{/if}

	<form
		method="post"
		class="mt-8 space-y-4"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<label class="block">
			<span class="text-sm text-ink-soft">Email</span>
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				value={form && 'email' in form ? (form.email as string) : ''}
				class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			/>
		</label>
		<label class="block">
			<span class="text-sm text-ink-soft">Password</span>
			<input
				type="password"
				name="password"
				required
				minlength="8"
				autocomplete="new-password"
				class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			/>
		</label>
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-60"
		>
			{loading ? 'Creating…' : 'Create account'}
		</button>
	</form>

	<p class="mt-6 text-sm text-ink-soft">
		Already have an account? <a href="/login" class="text-accent hover:underline">Sign in</a>.
	</p>
</section>
