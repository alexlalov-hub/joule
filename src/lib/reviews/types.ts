export const REVIEW_ASPECTS = ['overall', 'value', 'build', 'performance'] as const;
export type ReviewAspect = (typeof REVIEW_ASPECTS)[number];

export const ASPECT_LABELS: Record<ReviewAspect, string> = {
	overall: 'Overall',
	value: 'Value for money',
	build: 'Build quality',
	performance: 'Performance'
};

export type Review = {
	id: string;
	productSlug: string;
	userId: string | null;
	authorName: string;
	rating: number;
	aspect: ReviewAspect;
	title: string;
	body: string;
	createdAt: string;
};

export type ReviewSummary = {
	count: number;
	average: number | null;
	perAspect: Record<ReviewAspect, { count: number; average: number | null }>;
};

export function isAspect(value: string): value is ReviewAspect {
	return (REVIEW_ASPECTS as readonly string[]).includes(value);
}

export function summarize(reviews: Review[]): ReviewSummary {
	const summary: ReviewSummary = {
		count: reviews.length,
		average: null,
		perAspect: {
			overall: { count: 0, average: null },
			value: { count: 0, average: null },
			build: { count: 0, average: null },
			performance: { count: 0, average: null }
		}
	};
	if (reviews.length === 0) return summary;

	let total = 0;
	for (const r of reviews) {
		total += r.rating;
		const slot = summary.perAspect[r.aspect];
		slot.count += 1;
		slot.average = ((slot.average ?? 0) * (slot.count - 1) + r.rating) / slot.count;
	}
	summary.average = total / reviews.length;
	return summary;
}
