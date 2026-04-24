export type Category = {
	slug: string;
	name: string;
	blurb: string;
};

export type ProductImage = {
	url: string;
	alt: string;
};

export type ProductSpec = {
	label: string;
	value: string;
};

export type Product = {
	slug: string;
	name: string;
	brand: string;
	categorySlug: string;
	priceCents: number;
	tagline: string;
	description: string;
	specs: ProductSpec[];
	images: ProductImage[];
	stockQty: number;
	featured?: boolean;
	rating?: number;
	reviewCount?: number;
};

export function formatPrice(cents: number, currency = 'EUR'): string {
	return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(cents / 100);
}
