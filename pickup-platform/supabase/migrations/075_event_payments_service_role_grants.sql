-- Checkout/webhook use the service_role admin client against event_payments.
-- 073 only granted SELECT to authenticated (same gap as sponsorship tables in 054).

grant select, insert, update on public.event_payments to service_role;

-- 073 revoked complete_paid_event_join from public/anon/authenticated but omitted service_role.
grant execute on function public.complete_paid_event_join(text, text) to service_role;
