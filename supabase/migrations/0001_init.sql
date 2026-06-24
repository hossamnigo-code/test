-- HB Bank — initial schema, Row-Level Security, triggers and functions
-- Safe to run via the Supabase SQL Editor or `apply_migration`.
-- gen_random_uuid() is a core function in PostgreSQL 13+ (pg_catalog), no extension required.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  phone              text,
  preferred_language text not null default 'en' check (preferred_language in ('en','ar')),
  created_at         timestamptz not null default now()
);

create table if not exists public.accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  account_number text not null unique,
  account_type   text not null check (account_type in ('checking','savings')),
  currency       text not null default 'EGP',
  balance        numeric(14,2) not null default 0 check (balance >= 0),
  created_at     timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts(user_id);

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  type          text not null check (type in ('credit','debit')),
  amount        numeric(14,2) not null check (amount > 0),
  description   text,
  counterparty  text,
  balance_after numeric(14,2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists transactions_account_id_idx on public.transactions(account_id);

create table if not exists public.beneficiaries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  account_number text not null,
  created_at     timestamptz not null default now()
);
create index if not exists beneficiaries_user_id_idx on public.beneficiaries(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Balances are mutated ONLY through SECURITY DEFINER functions below, so no
-- public INSERT/UPDATE/DELETE on accounts or transactions is granted.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.accounts      enable row level security;
alter table public.transactions  enable row level security;
alter table public.beneficiaries enable row level security;

-- profiles: each user sees and edits only their own profile
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- accounts: each user sees only their own accounts (read-only from the client)
drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
  for select using (auth.uid() = user_id);

-- transactions: each user sees only transactions belonging to their accounts
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (
    exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
  );

-- beneficiaries: full CRUD on own rows
drop policy if exists beneficiaries_select_own on public.beneficiaries;
create policy beneficiaries_select_own on public.beneficiaries
  for select using (auth.uid() = user_id);
drop policy if exists beneficiaries_insert_own on public.beneficiaries;
create policy beneficiaries_insert_own on public.beneficiaries
  for insert with check (auth.uid() = user_id);
drop policy if exists beneficiaries_delete_own on public.beneficiaries;
create policy beneficiaries_delete_own on public.beneficiaries
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: generate a unique HB account number ('HB' + 12 digits)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_account_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := 'HB' || lpad((floor(random() * 1e12))::bigint::text, 12, '0');
    exit when not exists (select 1 from public.accounts where account_number = candidate);
  end loop;
  return candidate;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: on sign-up, create a profile + a checking and a savings account,
-- each seeded with a demo opening balance and a matching opening transaction.
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic money transfer. Verifies ownership of the source account, checks the
-- balance, debits the source and (for internal transfers) credits the
-- destination, recording paired transaction rows. Runs in a single statement
-- transaction; row locks prevent race conditions.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.transfer_funds(
  p_from_account     uuid,
  p_to_account_number text,
  p_amount           numeric,
  p_description      text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_from     public.accounts%rowtype;
  v_to       public.accounts%rowtype;
  v_from_new numeric(14,2);
  v_to_new   numeric(14,2);
  v_internal boolean := false;
  v_desc     text := coalesce(nullif(trim(p_description), ''), 'Transfer');
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  -- Lock and verify the source account belongs to the caller
  select * into v_from from public.accounts
    where id = p_from_account and user_id = v_uid
    for update;
  if not found then
    raise exception 'Source account not found' using errcode = 'P0002';
  end if;

  if v_from.account_number = p_to_account_number then
    raise exception 'Cannot transfer to the same account' using errcode = '22023';
  end if;
  if v_from.balance < p_amount then
    raise exception 'Insufficient funds' using errcode = 'P0001';
  end if;

  -- Debit the source
  v_from_new := v_from.balance - p_amount;
  update public.accounts set balance = v_from_new where id = v_from.id;

  -- Credit the destination if it exists in the bank (internal transfer)
  select * into v_to from public.accounts
    where account_number = p_to_account_number
    for update;
  v_internal := found;
  if v_internal then
    v_to_new := v_to.balance + p_amount;
    update public.accounts set balance = v_to_new where id = v_to.id;
    insert into public.transactions (account_id, type, amount, description, counterparty, balance_after)
    values (v_to.id, 'credit', p_amount, v_desc, v_from.account_number, v_to_new);
  end if;

  -- Record the debit on the source (always)
  insert into public.transactions (account_id, type, amount, description, counterparty, balance_after)
  values (v_from.id, 'debit', p_amount, v_desc, p_to_account_number, v_from_new);

  return json_build_object(
    'success',      true,
    'from_account', v_from.account_number,
    'to_account',   p_to_account_number,
    'amount',       p_amount,
    'from_balance', v_from_new,
    'internal',     v_internal
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function privileges
-- Internal helpers must not be callable via the REST API. Trigger execution does
-- not require EXECUTE privilege, so the sign-up trigger still fires normally.
-- transfer_funds is exposed to signed-in users only; it authorizes internally
-- via auth.uid(), so this SECURITY DEFINER + authenticated grant is intentional.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.generate_account_number() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.transfer_funds(uuid, text, numeric, text) from public, anon;
grant execute on function public.transfer_funds(uuid, text, numeric, text) to authenticated;
