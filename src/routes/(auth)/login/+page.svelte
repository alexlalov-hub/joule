<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { form } = $props();
	let loading = $state(false);

	const CALLBACK_ERRORS: Record<string, string> = {
		callback: 'Could not finish signing you in. Try again.',
		missing_code: 'That sign-in link was incomplete. Try requesting a fresh one.',
		exchange_failed:
			'That sign-in link expired or was already used. Request a new magic link below.',
		auth_unavailable: 'Auth is not configured on this deployment. Contact the operator.'
	};

	const callbackError = $derived(CALLBACK_ERRORS[page.url.searchParams.get('error') ?? ''] ?? null);
	const initialEmail = $derived(form && 'email' in form ? (form.email as string) : '');
</script>

<svelte:head><title>Sign in — Joule</title></svelte:head>

<section class="mx-auto max-w-md px-6 py-16 md:py-24">
	<div class="kicker text-accent">Account</div>
	<h1 class="mt-2 font-serif text-4xl font-normal">Sign in.</h1>
	<p class="mt-2 font-serif text-ink-soft italic">
		Email, magic link, or single sign-on. No password to forget.
	</p>

	{#if form?.message}
		<div
			class="mt-6 rounded-sm border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink"
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
	{:else if callbackError}
		<div
			class="mt-6 rounded-sm border border-accent/50 bg-accent/10 px-4 py-3 text-sm text-accent-deep"
			role="alert"
		>
			{callbackError}
		</div>
	{/if}

	<!--
		Single form so the email input is shared by both the password and the
		magic-link submit. Each submit uses formaction to pick the action.
		Password is intentionally not `required` at the HTML level — the
		magic-link submit doesn't need one, and the password action validates
		it server-side.
	-->
	<form
		method="post"
		action="?/password"
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
				value={initialEmail}
				class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			/>
		</label>
		<label class="block">
			<span class="text-sm text-ink-soft">Password</span>
			<input
				type="password"
				name="password"
				autocomplete="current-password"
				class="mt-1 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-accent"
			/>
			<span class="mt-1 block text-xs text-ink-faint">
				Leave blank and use “Email me a magic link” for password-less sign-in.
			</span>
		</label>
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-60"
		>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
		<button
			type="submit"
			formaction="?/magic"
			disabled={loading}
			class="w-full rounded-sm border border-ink px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
		>
			Email me a magic link
		</button>
	</form>

	<form method="post" action="?/oauth" class="mt-3 grid grid-cols-2 gap-2">
		<button
			type="submit"
			name="provider"
			value="google"
			class="rounded-sm border border-ink/20 px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent"
		>
			Google
		</button>
		<button
			type="submit"
			name="provider"
			value="github"
			class="rounded-sm border border-ink/20 px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent"
		>
			GitHub
		</button>
	</form>

	<p class="mt-6 text-sm text-ink-soft">
		Don't have an account? <a href="/signup" class="text-accent hover:underline">Create one</a>.
	</p>
</section>
