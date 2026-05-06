import { browser } from '$app/environment';

const STORAGE_KEY = 'joule:compare';
export const MAX_COMPARE = 3;

/** Lightweight per-product summary the tray needs to render — slug + display name. */
export type CompareEntry = {
	slug: string;
	name: string;
	brand: string;
	priceCents: number;
};

function readInitial(): CompareEntry[] {
	if (!browser) return [];
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(e): e is CompareEntry =>
					typeof e === 'object' &&
					e !== null &&
					typeof (e as CompareEntry).slug === 'string' &&
					typeof (e as CompareEntry).name === 'string'
			)
			.slice(0, MAX_COMPARE);
	} catch {
		return [];
	}
}

function persist(items: CompareEntry[]): void {
	if (!browser) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		/* sessionStorage can throw in privacy mode — silently ignore */
	}
}

/**
 * Compare-tray state. Singleton — every consumer shares the same array.
 * Persisted to sessionStorage so the tray survives navigation but resets
 * when the tab closes (which matches user intent for a session-scoped
 * stack).
 */
class CompareStore {
	items = $state<CompareEntry[]>(readInitial());

	get count(): number {
		return this.items.length;
	}

	get full(): boolean {
		return this.items.length >= MAX_COMPARE;
	}

	has(slug: string): boolean {
		return this.items.some((e) => e.slug === slug);
	}

	add(entry: CompareEntry): void {
		if (this.has(entry.slug)) return;
		// At capacity: drop the oldest to make room (FIFO).
		const next = this.full ? [...this.items.slice(1), entry] : [...this.items, entry];
		this.items = next;
		persist(next);
	}

	remove(slug: string): void {
		const next = this.items.filter((e) => e.slug !== slug);
		this.items = next;
		persist(next);
	}

	toggle(entry: CompareEntry): void {
		if (this.has(entry.slug)) this.remove(entry.slug);
		else this.add(entry);
	}

	clear(): void {
		this.items = [];
		persist([]);
	}

	get compareHref(): string {
		const slugs = this.items.map((e) => e.slug).join(',');
		return slugs ? `/compare?slugs=${slugs}` : '/compare';
	}
}

export const compareStore = new CompareStore();
