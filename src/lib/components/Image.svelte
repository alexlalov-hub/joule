<script lang="ts">
	/**
	 * Image — small wrapper that routes the URL through Vercel's image
	 * optimisation endpoint, sets width/height to prevent layout shift,
	 * and emits a srcset for 1x and 2x display densities.
	 *
	 * The Vercel endpoint (`/_vercel/image?url=<encoded>&w=<width>&q=<quality>`)
	 * fetches the source, transforms it to AVIF or WebP based on the
	 * client's Accept header, caches the result at the edge, and serves
	 * the right format for the browser. JPEG fallback is automatic.
	 *
	 * In local dev there's no /_vercel/image — pass the original URL
	 * through unchanged so dev still renders.
	 *
	 * Width and height are required: that's the load-bearing CLS fix.
	 * The browser uses them to reserve layout space before the image
	 * arrives.
	 */

	import { browser } from '$app/environment';

	type Props = {
		src: string | null | undefined;
		alt: string;
		width: number;
		height: number;
		/** Image quality 1-100, defaults to 75 (Vercel's default). */
		quality?: number;
		/** Set to true for above-the-fold images. Defaults to lazy. */
		priority?: boolean;
		class?: string;
	};

	let {
		src,
		alt,
		width,
		height,
		quality = 75,
		priority = false,
		class: className = ''
	}: Props = $props();

	function vercelImage(url: string, w: number): string {
		// During SSR or in local dev we don't have a Vercel runtime —
		// `import.meta.env.DEV` is true under `npm run dev`. Pass the URL
		// through so the dev server still renders.
		if (import.meta.env.DEV && browser) return url;
		const encoded = encodeURIComponent(url);
		return `/_vercel/image?url=${encoded}&w=${w}&q=${quality}`;
	}

	const sized = $derived(src ? vercelImage(src, width) : null);
	const sized2x = $derived(src ? vercelImage(src, width * 2) : null);
</script>

{#if sized}
	<img
		src={sized}
		srcset="{sized} 1x, {sized2x} 2x"
		{alt}
		{width}
		{height}
		loading={priority ? 'eager' : 'lazy'}
		decoding="async"
		fetchpriority={priority ? 'high' : 'auto'}
		class={className}
	/>
{/if}
