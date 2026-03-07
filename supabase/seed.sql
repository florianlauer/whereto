-- seed.sql
-- Test data for local development.
-- The handle_new_user trigger auto-creates profiles and wishlists rows.

-- =============================================================================
-- Test users (inserted into auth.users; trigger creates profile + wishlist)
-- =============================================================================

-- User 1: Alice
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) values (
  'a1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'alice@test.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Alice"}',
  now(),
  now(),
  '',
  ''
);

-- User 2: Bob
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) values (
  'b2222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'bob@test.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Bob"}',
  now(),
  now(),
  '',
  ''
);

-- =============================================================================
-- Wishlist items (trigger already created wishlists, so we look them up)
-- =============================================================================

-- Alice's items (Balkans trip)
insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'ge-tbilisi', 'GE', 0
from public.wishlists w where w.user_id = 'a1111111-1111-1111-1111-111111111111';

insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'al-tirana', 'AL', 1
from public.wishlists w where w.user_id = 'a1111111-1111-1111-1111-111111111111';

insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'ba-sarajevo', 'BA', 2
from public.wishlists w where w.user_id = 'a1111111-1111-1111-1111-111111111111';

insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'rs-belgrade', 'RS', 3
from public.wishlists w where w.user_id = 'a1111111-1111-1111-1111-111111111111';

-- Bob's items (Georgia + Bulgaria)
insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'ge-kazbegi', 'GE', 0
from public.wishlists w where w.user_id = 'b2222222-2222-2222-2222-222222222222';

insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'al-berat', 'AL', 1
from public.wishlists w where w.user_id = 'b2222222-2222-2222-2222-222222222222';

insert into public.wishlist_items (wishlist_id, poi_id, country_code, position)
select w.id, 'ba-mostar', 'BA', 2
from public.wishlists w where w.user_id = 'b2222222-2222-2222-2222-222222222222';
