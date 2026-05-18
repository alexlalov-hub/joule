/**
 * Hand-written Database types that mirror supabase/migrations/*. Replace with
 * `npm run db:types` output once the Supabase CLI is linked to a project —
 * the shape is what `supabase gen types typescript` produces.
 *
 * The shape must satisfy postgrest-js's `GenericSchema` — each table needs a
 * `Relationships` array (we leave it empty, which means embedded joins via
 * `select('foo, bar(...)')` won't be statically typed but won't error either).
 */

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type ReviewAspect = 'overall' | 'value' | 'build' | 'performance';
type OrderStatus =
	| 'pending'
	| 'paid'
	| 'fulfilling'
	| 'shipped'
	| 'completed'
	| 'cancelled'
	| 'refunded';
type ProfileRole = 'customer' | 'admin';

type CategoriesRow = {
	id: string;
	slug: string;
	name: string;
	blurb: string | null;
	sort_order: number;
	created_at: string;
};

type ProductsRow = {
	id: string;
	slug: string;
	name: string;
	brand: string;
	category_id: string;
	price_cents: number;
	currency: string;
	tagline: string;
	description: string;
	specs: Json;
	stock_qty: number;
	featured: boolean;
	search_tsv: string | null;
	embedding: string | number[] | null;
	created_at: string;
	updated_at: string;
};

type ProductImagesRow = {
	id: string;
	product_id: string;
	url: string;
	alt: string;
	sort_order: number;
};

type ProfilesRow = {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
	role: ProfileRole;
	created_at: string;
	updated_at: string;
};

type ReviewsRow = {
	id: string;
	product_id: string;
	user_id: string | null;
	rating: number;
	aspect: ReviewAspect | null;
	title: string;
	body: string;
	created_at: string;
};

type CartsRow = {
	id: string;
	user_id: string | null;
	anon_key: string | null;
	created_at: string;
	updated_at: string;
};

type CartItemsRow = {
	id: string;
	cart_id: string;
	product_id: string;
	quantity: number;
	added_at: string;
};

type OrdersRow = {
	id: string;
	user_id: string | null;
	email: string;
	status: OrderStatus;
	subtotal_cents: number;
	total_cents: number;
	currency: string;
	stripe_session: string | null;
	created_at: string;
	updated_at: string;
};

type OrderItemsRow = {
	id: string;
	order_id: string;
	product_id: string | null;
	product_slug: string;
	product_name: string;
	unit_price_cents: number;
	quantity: number;
};

type WishlistsRow = {
	user_id: string;
	product_id: string;
	added_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: [];
};

export type Database = {
	public: {
		Tables: {
			categories: Table<CategoriesRow>;
			products: Table<ProductsRow>;
			product_images: Table<ProductImagesRow>;
			profiles: Table<ProfilesRow>;
			reviews: Table<ReviewsRow>;
			carts: Table<CartsRow>;
			cart_items: Table<CartItemsRow>;
			orders: Table<OrdersRow>;
			order_items: Table<OrderItemsRow>;
			wishlists: Table<WishlistsRow>;
		};
		Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
		Functions: {
			match_products: {
				Args: {
					query_embedding: number[];
					category_slug?: string | null;
					match_count?: number;
				};
				Returns: { slug: string; similarity: number }[];
			};
		};
		Enums: {
			review_aspect: ReviewAspect;
			order_status: OrderStatus;
			profile_role: ProfileRole;
		};
	};
};
