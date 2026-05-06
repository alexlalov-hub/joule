-- Joule — semantic search RPC
-- Returns product slugs ranked by cosine similarity to a query embedding,
-- optionally filtered by category. Slugs are looked up via the standard
-- product select on the application side, so this RPC stays narrow.

create or replace function public.match_products(
    query_embedding vector(1536),
    category_slug text default null,
    match_count int default 24
)
returns table (
    slug text,
    similarity float
)
language sql stable as $$
    select
        p.slug,
        1 - (p.embedding <=> query_embedding) as similarity
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.embedding is not null
        and (category_slug is null or c.slug = category_slug)
    order by p.embedding <=> query_embedding
    limit greatest(match_count, 1);
$$;

grant execute on function public.match_products(vector(1536), text, int) to anon, authenticated;
