-- HB Bank — feature expansion migration.
-- Adds cards and savings goals, plus SECURITY DEFINER RPCs for bill payments,
-- goal contributions and card freeze/unfreeze. Builds on 0001_init.sql and
-- reuses the same security model (RLS everywhere; balances mutated only through
-- SECURITY DEFINER functions). Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- Cards (one virtual card per account, seeded on sign-up)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  account_id   uuid not null references public.accounts(id) on delete cascade,
  card_number  text not null unique,
  card_brand   text not null default 'HB Platinum',
  card_network text not null default 'visa' check (card_network in ('visa','mastercard')),
  card_type    text not null default 'debit' check (card_type in ('debit','credit')),
  expiry_month int  not null check (expiry_month between 1 and 12),
  expiry_year  int  not null,
  status       text not null default 'active' check (status in ('active','frozen')),
  created_at   timestamptz not null default now()
);
create index if not exists cards_user_id_idx on public.cards(user_id);

alter table public.cards enable row level security;
drop policy if exists cards_select_own on public.cards;
create policy cards_select_own on public.cards
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Savings goals
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0),
  color         text not null default 'teal',
  created_at    timestamptz not null default now()
);
create index if not exists goals_user_id_idx on public.goals(user_id);

alter table public.goals enable row level security;
-- Users manage their own goals' metadata directly; the saved_amount is moved by
-- contribute_to_goal() below, which also debits a real account atomically.
drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals for select using (auth.uid() = user_id);
drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own on public.goals for insert with check (auth.uid() = user_id);
drop policy if exists goals_update_own on public.goals;
create policy goals_update_own on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists goals_delete_own on public.goals;
create policy goals_delete_own on public.goals for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: generate a unique 16-digit card number
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_card_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := '4' || lpad((floor(random() * 1e15))::bigint::text, 15, '0');
    exit when not exists (select 1 from public.cards where card_number = candidate);
  end loop;
  return candidate;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Re-create the sign-up trigger function so new users also get two cards.
-- (Same body as 0001 plus the card inserts.)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name         text;
  v_phone        text;
  v_lang         text;
  v_checking_id  uuid;
  v_savings_id   uuid;
  v_checking_open numeric(14,2) := 50000.00;
  v_savings_open  numeric(14,2) := 25000.00;
  v_exp_year      int := extract(year from now())::int + 4;
begin
  v_name  := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  v_phone := nullif(trim(new.raw_user_meta_data->>'phone'), '');
  v_lang  := coalesce(new.raw_user_meta_data->>'preferred_language', 'en');
  if v_lang not in ('en','ar') then v_lang := 'en'; end if;

  insert into public.profiles (id, full_name, phone, preferred_language)
  values (new.id, v_name, v_phone, v_lang);

  insert into public.accounts (user_id, account_number, account_type, currency, balance)
  values (new.id, public.generate_account_number(), 'checking', 'EGP', v_checking_open)
  returning id into v_checking_id;

  insert into public.accounts (user_id, account_number, account_type, currency, balance)
  values (new.id, public.generate_account_number(), 'savings', 'EGP', v_savings_open)
  returning id into v_savings_id;

  insert into public.transactions (account_id, type, amount, description, counterparty, balance_after)
  values
    (v_checking_id, 'credit', v_checking_open, 'Account opening credit', 'HB Bank', v_checking_open),
    (v_savings_id,  'credit', v_savings_open,  'Account opening credit', 'HB Bank', v_savings_open);

  insert into public.cards (user_id, account_id, card_number, card_brand, card_network, card_type, expiry_month, expiry_year)
  values
    (new.id, v_checking_id, public.generate_card_number(), 'HB Platinum', 'visa',       'debit', 12, v_exp_year),
    (new.id, v_savings_id,  public.generate_card_number(), 'HB Gold',     'mastercard', 'debit', 12, v_exp_year);

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: pay a bill — debits the source account and records a transaction.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.pay_bill(
  p_from_account uuid,
  p_biller       text,
  p_reference    text,
  p_amount       numeric
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_from public.accounts%rowtype;
  v_new  numeric(14,2);
  v_ref  text := nullif(trim(p_reference), '');
  v_desc text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;
  if coalesce(trim(p_biller), '') = '' then
    raise exception 'Biller is required' using errcode = '22023';
  end if;

  select * into v_from from public.accounts
    where id = p_from_account and user_id = v_uid
    for update;
  if not found then
    raise exception 'Source account not found' using errcode = 'P0002';
  end if;
  if v_from.balance < p_amount then
    raise exception 'Insufficient funds' using errcode = 'P0001';
  end if;

  v_new := v_from.balance - p_amount;
  update public.accounts set balance = v_new where id = v_from.id;

  v_desc := 'Bill payment · ' || p_biller || coalesce(' (' || v_ref || ')', '');
  insert into public.transactions (account_id, type, amount, description, counterparty, balance_after)
  values (v_from.id, 'debit', p_amount, v_desc, p_biller, v_new);

  return json_build_object('success', true, 'biller', p_biller, 'amount', p_amount, 'balance', v_new);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: contribute to a savings goal — debits an account and bumps the goal.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.contribute_to_goal(
  p_goal         uuid,
  p_from_account uuid,
  p_amount       numeric
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_from     public.accounts%rowtype;
  v_goal     public.goals%rowtype;
  v_new      numeric(14,2);
  v_goal_new numeric(14,2);
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  select * into v_goal from public.goals
    where id = p_goal and user_id = v_uid
    for update;
  if not found then
    raise exception 'Goal not found' using errcode = 'P0002';
  end if;

  select * into v_from from public.accounts
    where id = p_from_account and user_id = v_uid
    for update;
  if not found then
    raise exception 'Source account not found' using errcode = 'P0002';
  end if;
  if v_from.balance < p_amount then
    raise exception 'Insufficient funds' using errcode = 'P0001';
  end if;

  v_new := v_from.balance - p_amount;
  update public.accounts set balance = v_new where id = v_from.id;

  v_goal_new := v_goal.saved_amount + p_amount;
  update public.goals set saved_amount = v_goal_new where id = v_goal.id;

  insert into public.transactions (account_id, type, amount, description, counterparty, balance_after)
  values (v_from.id, 'debit', p_amount, 'Savings goal · ' || v_goal.name, 'HB Goals', v_new);

  return json_build_object('success', true, 'goal', v_goal.name, 'saved', v_goal_new, 'target', v_goal.target_amount, 'balance', v_new);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: freeze / unfreeze one of the caller's own cards.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_card_status(
  p_card   uuid,
  p_status text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_card public.cards%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_status not in ('active','frozen') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  update public.cards set status = p_status
    where id = p_card and user_id = v_uid
    returning * into v_card;
  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;

  return json_build_object('success', true, 'status', v_card.status);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: give existing accounts a card if they don't already have one.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.cards (user_id, account_id, card_number, card_brand, card_network, card_type, expiry_month, expiry_year)
select a.user_id,
       a.id,
       public.generate_card_number(),
       case when a.account_type = 'savings' then 'HB Gold'     else 'HB Platinum' end,
       case when a.account_type = 'savings' then 'mastercard'  else 'visa' end,
       'debit',
       12,
       extract(year from now())::int + 4
from public.accounts a
where not exists (select 1 from public.cards c where c.account_id = a.id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Function privileges (mirror 0001: internal helpers off the API; RPCs to
-- authenticated only — each authorizes internally via auth.uid()).
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.generate_card_number() from public, anon, authenticated;
revoke all on function public.pay_bill(uuid, text, text, numeric) from public, anon;
grant  execute on function public.pay_bill(uuid, text, text, numeric) to authenticated;
revoke all on function public.contribute_to_goal(uuid, uuid, numeric) from public, anon;
grant  execute on function public.contribute_to_goal(uuid, uuid, numeric) to authenticated;
revoke all on function public.set_card_status(uuid, text) from public, anon;
grant  execute on function public.set_card_status(uuid, text) to authenticated;
