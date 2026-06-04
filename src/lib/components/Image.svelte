<script lang="ts">
	/**
	 * Image — small wrapper that sets the boilerplate every product
	 * <img> should have: explicit width/height (for CLS prevention),
	 * lazy loading by default with a `priority` opt-out for above-
	 * the-fold images, async decoding, and a fetchpriority hint.
	 *
	 * The URL is passed straight through. An earlier version routed
	 * through Vercel's /_vercel/image transform endpoint — it returned
	 * 84-byte error responses on every image request because the widths
	 * we asked for weren't in the vercel.json `sizes` whitelist, and
	 * even with that fixed the transform path was slower than the
	 * direct Unsplash CDN path the project already uses (Unsplash
	 * already serves AVIF/WebP when supported). Removed; reverted to
	 * pass-through.
	 *
	 * The load-bearing piece of this component is the width/height
	 * being required: with those set, the browser reserves layout
	 * space before the image arrives and the page can't reflow. CLS
	 * stays at zero as the catalog grows.
	 */

	type Props = {
		src: string | null | undefined;
		alt: string;
		width: number;
		height: number;
		/** Set to true for above-the-fold images. Defaults to lazy. */
		priority?: boolean;
		class?: string;
	};

	let { src, alt, width, height, priority = false, class: className = '' }: Props = $props();
</script>

{#if src}
	<img
		{src}
		{alt}
		{width}
		{height}
		loading={priority ? 'eager' : 'lazy'}
		decoding="async"
		fetchpriority={priority ? 'high' : 'auto'}
		class={className}
	/>
{/if}
