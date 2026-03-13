# Milestones

## v1.0 Auth + Persistence (Shipped: 2026-03-13)

**Phases:** 4 | **Plans:** 9 | **Tasks:** ~16
**Files modified:** 58 | **LOC:** 5,492 TypeScript
**Timeline:** 13 days (2026-03-01 → 2026-03-13)
**Git range:** `feat(01-01)` → `feat(04-02)`

**Key accomplishments:**

1. Supabase DB schema (profiles, wishlists, wishlist_items) with RLS + auto-creation triggers
2. tRPC + Hono API deployed on Vercel serverless with typed client
3. Auth via email/password, magic link, Google OAuth with non-blocking UX
4. Unified `useWishlist()` hook — components agnostic of anonymous vs authenticated mode
5. localStorage-to-server merge on login with deduplication and safe cleanup
6. Optimistic updates with rollback, logout cleanup, cross-device sync

**Known Gaps:**

- AUTH-05 was partial (useAuthGatedAction not wired) — fixed during milestone completion
- Tech debt: `db.ts` SUPABASE_ANON_KEY fallback, unused `wishlist.update`/`wishlist.reorder` endpoints

**Archives:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`, `milestones/v1.0-MILESTONE-AUDIT.md`

---
