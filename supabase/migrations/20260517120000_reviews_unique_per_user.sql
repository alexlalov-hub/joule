-- One review per (product, user). Seed reviews have user_id = null and are
-- exempt from the constraint, so they coexist with real reviews while the
-- catalog is bootstrapping.

create unique index if not exists reviews_one_per_user
    on public.reviews (product_id, user_id)
    where user_id is not null;
