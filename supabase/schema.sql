-- Gift Picker database. Run this once in the Supabase SQL editor, then run
-- seed.sql to load the starter products.
-- A family giver's people, dates and orders belong to them (owner_id).
-- A business's employees belong to the business (org_id), and everyone on
-- that business's team can see them. Row level security enforces both.

-- ---------- Businesses ----------
create table if not exists orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create or replace function is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = p_org and user_id = auth.uid());
$$;

-- ---------- Catalog ----------
-- Read on the server only, so cost and supplier details never reach the
-- browser. No policies = only the service role can touch these tables.
create table if not exists suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text,
  website       text,
  terms         text,                       -- e.g. "wholesale 50%, they drop-ship"
  created_at    timestamptz not null default now()
);

create table if not exists products (
  sku          text primary key,
  supplier_id  uuid references suppliers(id) on delete set null,
  name         text not null,
  description  text,
  price_cents  int not null check (price_cents > 0),  -- source price: what the supplier charges you
  cost_cents   int,                                     -- not used since the 10% markup (kept so old data loads)
  tags         text[] not null default '{}',            -- interests: coffee, gaming, art...
  styles       text[] not null default '{}',            -- classy, outdoor, personal care... (lib/types.ts STYLES)
  occasions    text[] not null default '{}',            -- empty = fits any occasion (lib/types.ts OCCASIONS)
  sex          text not null default 'any' check (sex in ('f','m','any')),
  age_min      int not null default 0,
  age_max      int not null default 120,
  image_url    text,
  ships_by     text not null default 'self',  -- self (you ship) | supplier (they drop-ship)
  supplier_ref text,                          -- the supplier's own product id
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- People and dates ----------
create table if not exists recipients (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  org_id       uuid references orgs(id) on delete cascade,  -- set for a business's employees
  name         text not null,
  relationship text,                      -- niece, nephew, mom, friend...
  department   text,                      -- business only
  work_start   date,                      -- business only: work anniversaries
  email        text,                      -- where a gift link goes
  birthdate    date,                      -- year 1904 = year not given
  sex          text check (sex in ('f','m','any')) default 'any',
  city         text,
  likes        text[] not null default '{}',
  dislikes     text[] not null default '{}',
  budget_min   int not null default 25,
  budget_max   int not null default 75,
  notes        text,
  source       text default 'manual',     -- manual | google_contacts | spreadsheet
  created_at   timestamptz not null default now()
);

-- Life events: birthdays come from recipients.birthdate,
-- everything else (graduation, wedding, new baby, holidays) lives here.
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  recipient_id  uuid not null references recipients(id) on delete cascade,
  kind          text not null,
  title         text not null,
  event_date    date not null,
  recurs_yearly boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists reminder_log (
  owner_id     uuid not null references auth.users(id) on delete cascade,
  key          text not null,
  sent_at      timestamptz not null default now(),
  primary key (owner_id, key)
);

-- ---------- Orders ----------
create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  org_id                uuid references orgs(id) on delete set null,
  recipient_id          uuid references recipients(id) on delete set null,
  recipient_name        text,                 -- for gifts sent from the quick finder
  product               jsonb not null,       -- {sku, name, ships_by, message}
  original_sku          text,                 -- set when the recipient swapped
  gift_cents            int not null,         -- also the most a swap can be worth
  fee_cents             int not null,
  delivery              text not null default 'ship' check (delivery in ('ship','link')),
  sender_name           text,
  recipient_email       text,
  claim_token           text unique,          -- secret part of the gift link
  claim_status          text check (claim_status in ('unclaimed','claimed','swapped','expired')),
  claim_expires_at      timestamptz,
  claimed_at            timestamptz,
  ship_to               jsonb,
  status                text not null default 'pending', -- pending | paid | ordered | shipped | delivered | refunded | failed
  stripe_session_id     text unique,
  stripe_payment_intent text,
  fulfillment_ref       text,
  created_at            timestamptz not null default now()
);

alter table orgs         enable row level security;
alter table org_members  enable row level security;
alter table suppliers    enable row level security;
alter table products     enable row level security;
alter table recipients   enable row level security;
alter table events       enable row level security;
alter table reminder_log enable row level security;
alter table orders       enable row level security;

-- Dropped first so this file can be run again.
drop policy if exists "member orgs" on orgs;
drop policy if exists "member list" on org_members;
drop policy if exists "own or team recipients" on recipients;
drop policy if exists "own events" on events;
drop policy if exists "own reminders" on reminder_log;
drop policy if exists "read own orders" on orders;
create policy "member orgs"    on orgs        for select using (is_org_member(id));
create policy "member list"    on org_members for select using (user_id = auth.uid() or is_org_member(org_id));
create policy "own or team recipients" on recipients for all
  using (owner_id = auth.uid() or (org_id is not null and is_org_member(org_id)))
  with check (owner_id = auth.uid() and (org_id is null or is_org_member(org_id)));
create policy "own events"     on events     for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own reminders"  on reminder_log for select using (owner_id = auth.uid());
-- Orders are written by the server (service role) only; givers can read theirs.
create policy "read own orders" on orders for select
  using (owner_id = auth.uid() or (org_id is not null and is_org_member(org_id)));

create index if not exists recipients_owner on recipients(owner_id);
create index if not exists recipients_org   on recipients(org_id);
create index if not exists events_owner     on events(owner_id, event_date);
create index if not exists orders_claim     on orders(claim_status, claim_expires_at);

-- ---------- Added Nov 24: markup pricing, text delivery, family perk ----------
-- Safe to run again on a database made with the first version of this file.
-- products.price_cents is now the source price (what the supplier charges you);
-- shoppers pay that plus MARKUP_PERCENT. cost_cents is no longer used.
alter table products add column if not exists emoji text;
alter table orders add column if not exists recipient_phone text;  -- "text" delivery: the giver texts the link
-- A business's gift style, guessed from its name at sign-up and editable on /business.
alter table orgs add column if not exists gift_kind text;
alter table orgs add column if not exists gift_min int;
alter table orgs add column if not exists gift_max int;
alter table orgs add column if not exists gift_styles text[] not null default '{}';
alter table orgs add column if not exists gift_avoid text[] not null default '{}';
alter table orders add column if not exists perk_applied boolean not null default false;
alter table orders drop constraint if exists orders_delivery_check;
alter table orders add constraint orders_delivery_check check (delivery in ('ship','link','text'));

-- Someone who got a gift from a business and made their own account.
-- One perk per person and per gift; granted by the server, read by its owner.
create table if not exists perks (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  from_name  text,                                   -- the business that sent the gift
  from_order uuid unique references orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  used_at    timestamptz,
  used_order uuid references orders(id) on delete set null
);
alter table perks enable row level security;
drop policy if exists "read own perk" on perks;
create policy "read own perk" on perks for select using (user_id = auth.uid());

-- Access tokens for supplier APIs (CJdropshipping). Server only: RLS on, no policies.
create table if not exists supplier_tokens (
  supplier   text primary key,
  token      text not null,
  expires_at timestamptz not null
);
alter table supplier_tokens enable row level security;
