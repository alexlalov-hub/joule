<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="mt-24 bg-ink text-paper">
	<div class="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4 md:px-10">
		<div class="md:col-span-2">
			<div class="font-serif text-3xl font-medium">
				Jo<span class="text-accent-warm italic">ule</span>
			</div>
			<p class="mt-3 max-w-sm text-sm text-paper/60">
				Electronics, considered. Laptops, phones, audio, and peripherals — chosen with care,
				photographed properly, and described without the fluff.
			</p>
		</div>

		<div>
			<div class="mb-3 kicker text-paper/50">Shop</div>
			<ul class="space-y-2 text-sm">
				<li>
					<a href="/categories" class="text-paper/80 hover:text-accent-warm">All categories</a>
				</li>
				<li><a href="/search" class="text-paper/80 hover:text-accent-warm">Search</a></li>
				<li>
					<a href="/category/laptops" class="text-paper/80 hover:text-accent-warm">Laptops</a>
				</li>
				<li>
					<a href="/category/headphones" class="text-paper/80 hover:text-accent-warm">Headphones</a>
				</li>
			</ul>
		</div>

		<div>
			<div class="mb-3 kicker text-paper/50">Company</div>
			<ul class="space-y-2 text-sm">
				<li>
					<a href="/about" class="text-paper/80 hover:text-accent-warm">About</a>
				</li>
				<li><a href="/login" class="text-paper/80 hover:text-accent-warm">Sign in</a></li>
				<li><a href="/signup" class="text-paper/80 hover:text-accent-warm">Create account</a></li>
			</ul>
		</div>
	</div>

	<div class="border-t border-paper/10">
		<div
			class="mx-auto flex max-w-7xl flex-col items-start gap-2 px-6 py-6 font-mono text-[10px] tracking-widest text-paper/50 uppercase md:flex-row md:items-center md:justify-between md:px-10"
		>
			<span>© {year} Joule</span>
			<span>Shipped from the EU · 30-day returns</span>
		</div>
	</div>
</footer>
