/**
 * Tiny Supabase-client stub for unit tests.
 *
 * We chain a lot in the production code:
 *
 *   sb.from('wishlists').select('...').eq('user_id', u).eq('product_id', p).maybeSingle()
 *
 * Each link returns either a Promise (terminal) or another chainable object
 * (non-terminal). Building a generic mock that "remembers" the calls and
 * returns scripted results per call site is more code than it's worth — we
 * use a per-table script of terminal results instead.
 *
 * Usage:
 *
 *   const sb = makeStub({
 *     products: { maybeSingle: { data: { id: 'p1' }, error: null } },
 *     wishlists: {
 *       maybeSingle: { data: null, error: null },        // existence check
 *       insert: { data: null, error: null }              // toggle add
 *     }
 *   });
 *
 * If a query reaches a terminal not present in the script, the stub throws
 * with the table name + terminal so the test fails loudly rather than
 * silently returning undefined.
 *
 * The stub also tracks every (table, op) pair for assertions:
 *   expect(sb.calls).toContainEqual({ table: 'wishlists', op: 'insert', payload: ... });
 */

export type StubResult = { data?: unknown; error?: unknown; count?: number };

// Terminal verbs the stub can answer for a given table. Excludes the
// sequence-helper field below so `entry[op]` always narrows to StubResult,
// not StubResult | StubResult[].
export type TerminalOp =
	| 'maybeSingle'
	| 'single'
	| 'select'
	| 'insert'
	| 'update'
	| 'delete'
	| 'upsert'
	| 'rpc';

export type StubTable = Partial<Record<TerminalOp, StubResult>> & {
	// Sequential results for repeated terminal calls against the same table.
	// If `maybeSingleSequence` is set, each invocation pops the next entry.
	maybeSingleSequence?: StubResult[];
};

export type StubScript = Record<string, StubTable>;

export type RecordedCall = {
	table: string;
	op: string;
	payload?: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function makeStub(script: StubScript): {
	client: Any;
	calls: RecordedCall[];
} {
	const calls: RecordedCall[] = [];

	function terminal(table: string, op: TerminalOp, payload?: unknown): Promise<StubResult> {
		calls.push({ table, op, payload });
		const entry = script[table];
		if (!entry) {
			throw new Error(`supabase stub: no script for table "${table}" (op=${op})`);
		}
		if (op === 'maybeSingle' && entry.maybeSingleSequence?.length) {
			return Promise.resolve(entry.maybeSingleSequence.shift()!);
		}
		const result = entry[op];
		if (result === undefined) {
			throw new Error(`supabase stub: no script for "${table}".${op}`);
		}
		return Promise.resolve(result);
	}

	function builder(table: string, op: TerminalOp, payload?: unknown): Any {
		// Writes chained through ".select(...).single()" or ".select(...).maybeSingle()"
		// should still record as the original write op (insert/update/upsert/delete),
		// not as the terminal verb. Matches how production code is shaped:
		//   sb.from('x').insert({...}).select('id').single()
		// is one logical operation — an insert whose result is one row.
		const writeOps: ReadonlyArray<TerminalOp> = ['insert', 'update', 'upsert', 'delete'];
		const isWrite = writeOps.includes(op);

		const node: Any = {
			eq: () => node,
			neq: () => node,
			gt: () => node,
			gte: () => node,
			lt: () => node,
			lte: () => node,
			in: () => node,
			is: () => node,
			ilike: () => node,
			like: () => node,
			or: () => node,
			textSearch: () => node,
			order: () => node,
			limit: () => node,
			range: () => node,
			select: () => node,
			maybeSingle: () => terminal(table, isWrite ? op : 'maybeSingle', payload),
			single: () => terminal(table, isWrite ? op : 'single', payload),
			then: (resolve: (v: StubResult) => unknown, reject?: (e: unknown) => unknown) =>
				terminal(table, op, payload).then(resolve, reject)
		};
		return node;
	}

	const client: Any = {
		from(table: string) {
			return {
				select: () => builder(table, 'select'),
				insert: (payload: unknown) => builder(table, 'insert', payload),
				update: (payload: unknown) => builder(table, 'update', payload),
				delete: () => builder(table, 'delete'),
				upsert: (payload: unknown) => builder(table, 'upsert', payload)
			};
		},
		rpc(fn: string, args: unknown) {
			calls.push({ table: fn, op: 'rpc', payload: args });
			const entry = script[fn];
			if (!entry) {
				throw new Error(`supabase stub: no script for rpc "${fn}"`);
			}
			return Promise.resolve(entry.rpc ?? { data: null, error: null });
		}
	};

	return { client, calls };
}
