-- Joule — mark_order_paid RPC
--
-- Single-transaction order transition + stock decrement. Two things matter:
--
--  1. Idempotency. Both /checkout/reconcile (browser-side return URL) and the
--     Stripe webhook may fire for the same checkout session. The function
--     no-ops when the order is already paid, so calling it twice is safe.
--  2. Stock cannot go below zero. We clamp with greatest(0, ...) — if a race
--     somehow oversold, we surface a zero rather than a negative.
--
-- Returns true iff this call was the one that flipped the status.

create or replace function public.mark_order_paid(
    p_order_id uuid,
    p_total_cents int default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_changed int;
begin
    update public.orders
    set
        status = 'paid',
        total_cents = coalesce(p_total_cents, total_cents),
        updated_at = now()
    where id = p_order_id
      and status <> 'paid';

    get diagnostics v_changed = row_count;
    if v_changed = 0 then
        return false;
    end if;

    -- Decrement stock for each line item exactly once. greatest(0, ...) is the
    -- floor — we never let stock_qty go negative, which would happen on a
    -- concurrent oversold race even though we try to avoid it in code.
    update public.products p
    set stock_qty = greatest(0, p.stock_qty - oi.quantity)
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
      and p.id = oi.product_id;

    return true;
end;
$$;

grant execute on function public.mark_order_paid(uuid, int) to anon, authenticated;
