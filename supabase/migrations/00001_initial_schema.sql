-- 00001_initial_schema.sql
-- Creates profiles, wishlists, and wishlist_items tables with RLS policies
-- and auto-creation triggers for new user signup.

-- =============================================================================
-- Tables
-- =============================================================================

-- Profiles (minimal: id + timestamps)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Wishlists (one per user, enforced by unique constraint)
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.wishlists enable row level security;

-- Wishlist items (references POI by id, no FK to static data)
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  poi_id text not null,
  country_code text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wishlist_id, poi_id)
);
alter table public.wishlist_items enable row level security;

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- Wishlists: users can only access their own wishlist
create policy "Users can view own wishlists"
  on public.wishlists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can update own wishlists"
  on public.wishlists for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- Wishlist items: access through wishlist ownership chain
create policy "Users can view own wishlist items"
  on public.wishlist_items for select
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can insert own wishlist items"
  on public.wishlist_items for insert
  to authenticated
  with check (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can update own wishlist items"
  on public.wishlist_items for update
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can delete own wishlist items"
  on public.wishlist_items for delete
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- Trigger: Auto-create profile + wishlist on signup
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.wishlists (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Trigger: Auto-update updated_at on row modification
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.wishlists
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.wishlist_items
  for each row execute function public.handle_updated_at();
