-- 00002_add_days_min.sql
-- Adds days_min column to wishlist_items for minimum stay duration tracking.

alter table public.wishlist_items
  add column days_min integer not null default 1;
