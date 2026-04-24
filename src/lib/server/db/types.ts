/**
 * Generated types placeholder. Run `npm run db:types` once the Supabase CLI is
 * linked to a project to replace this with the real generated types.
 */
export type Database = {
	public: {
		Tables: Record<
			string,
			{
				Row: Record<string, unknown>;
				Insert: Record<string, unknown>;
				Update: Record<string, unknown>;
			}
		>;
		Views: Record<string, { Row: Record<string, unknown> }>;
		Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
		Enums: Record<string, string>;
	};
};
