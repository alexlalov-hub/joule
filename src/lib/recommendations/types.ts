import type { Product } from '$lib/catalog/types';

export type ReasonKind = 'bought' | 'saved' | 'similar' | 'same_brand';

export type Reason = {
	kind: ReasonKind;
	anchorSlug: string;
	anchorName: string;
	category: string;
	/** Optional brand label for `same_brand` reasons. */
	brand?: string;
	/** 0..1 cosine similarity to the user vector, when embedding-driven. */
	similarity?: number;
};

export type Recommendation = {
	product: Product;
	reason: Reason;
};

export function reasonText(reason: Reason): string {
	switch (reason.kind) {
		case 'bought':
			return `Because you bought ${reason.anchorName}`;
		case 'saved':
			return `Because you saved ${reason.anchorName} to your wishlist`;
		case 'similar':
			return `Similar to your ${reason.anchorName}`;
		case 'same_brand':
			return `${reason.brand ?? 'Same brand'} — like your ${reason.anchorName}`;
	}
}
