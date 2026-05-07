import type { Product } from '$lib/catalog/types';

export type ReasonKind = 'bought' | 'saved';

export type Reason = {
	kind: ReasonKind;
	anchorSlug: string;
	anchorName: string;
	category: string;
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
	}
}
