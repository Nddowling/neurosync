create role neurosync_billing nologin;
create table public.billing_customers (
 owner_uid text primary key references public.clinicians(uid),stripe_customer_id text not null unique,
 created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
alter table public.billing_customers force row level security;
create policy billing_customer_owner on public.billing_customers to app_rw using(owner_uid=public.current_uid()) with check(owner_uid=public.current_uid());
grant select,insert on public.billing_customers to app_rw;
create table auth_private.stripe_events (event_id text primary key,processed_at timestamptz not null default now());
grant usage on schema public,auth_private to neurosync_billing;
grant select on public.billing_customers to neurosync_billing;
create policy billing_customer_service on public.billing_customers for select to neurosync_billing using(true);
grant select,insert,update on public.user_subscriptions to neurosync_billing;
create policy subscription_service on public.user_subscriptions to neurosync_billing using(true) with check(true);
grant select,insert on auth_private.stripe_events to neurosync_billing;
-- No clinical table grants and no runtime role membership in commerce authority.
