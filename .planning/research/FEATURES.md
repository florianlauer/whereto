# Feature Landscape: Auth + Persistence for Whereto

**Domain:** Travel discovery app adding user accounts and persistent wishlist
**Researched:** 2026-03-07
**Confidence:** HIGH (well-documented domain, clear existing codebase, Supabase patterns verified)

## Table Stakes

Features users expect when an app introduces accounts. Missing any of these and users feel the auth was bolted on or broken.

| Feature                                  | Why Expected                                                                                                             | Complexity | Notes                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Email/password sign-up and login**     | Most basic auth method; users expect it exists even if they use OAuth                                                    | Low        | Supabase Auth handles this out of the box. Must include email verification flow.                                                                       |
| **Google OAuth**                         | "Continue with Google" is the #1 social login by usage. Users expect one-tap sign-in.                                    | Low        | Supabase Auth + Google Cloud Console setup. Redirect callback must preserve URL query params (filters).                                                |
| **Magic link email**                     | Passwordless login is table stakes for modern apps. Reduces friction for users who hate remembering passwords.           | Low        | Supabase Auth built-in. Beware: email delivery delays and spam folder issues are common UX complaints.                                                 |
| **Auth is non-blocking (optional)**      | App currently works without accounts (Epics 1-3). Forcing sign-up to use the map would destroy the core experience.      | Medium     | Auth prompt only surfaces at "Save" action. "Continue without account" must be prominent. This is the most important UX decision.                      |
| **Wishlist persists cross-device**       | The entire point of adding accounts. If a user signs in on their phone and their wishlist is missing, auth has no value. | Medium     | `wishlist.get` on app load when authenticated. TanStack Query for fetching + Zustand for local state.                                                  |
| **localStorage merge on first login**    | Users who built a wishlist anonymously must not lose it when they create an account. Data loss = trust destroyed.        | High       | Union merge: localStorage items + Supabase items, deduplicate by `poi_id`. Last-write-wins is fine here since items are simple add/remove, not edited. |
| **Optimistic UI updates**                | Authenticated actions (add/remove POI) must feel instant, not wait for server round-trip.                                | Medium     | Zustand store updates immediately; tRPC mutation fires in background. Rollback on error with toast notification.                                       |
| **Sign out**                             | Users expect to log out and have their session cleared.                                                                  | Low        | `supabase.auth.signOut()` + clear Zustand wishlist + clear localStorage. Do NOT keep wishlist items after logout (privacy).                            |
| **Session persistence (refresh tokens)** | Users expect to stay logged in across browser restarts. "Log in every time I open the app" is unacceptable.              | Low        | Supabase handles refresh tokens automatically via `@supabase/ssr`. Verify cookie-based session management works with Vercel deployment.                |
| **Loading and error states for auth**    | "Check your inbox" after magic link, spinner during OAuth redirect, error messages for failed login.                     | Low        | Basic but often overlooked. Include: "Email not found", "Invalid magic link", "OAuth cancelled", "Network error".                                      |

## Differentiators

Features that elevate the experience beyond "it has accounts." Not expected, but make users think "this is well-made."

| Feature                                    | Value Proposition                                                                                                                                                     | Complexity | Notes                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt-to-save at the right moment**     | Instead of a generic "Sign up" button, prompt auth when the user adds their first POI to wishlist. Context-aware trigger converts better than a nav bar login button. | Low        | Auth modal triggered by `addToWishlist` when `!user`. Show the POI they just selected with "Sign in to save this and access it anywhere." |
| **Silent merge with visual confirmation**  | After login, show a brief toast: "3 saved destinations synced to your account" instead of silently merging. Users feel their data was respected.                      | Low        | Count localStorage items merged, show toast via Sonner.                                                                                   |
| **Account indicator without profile page** | Small avatar/initial in the top bar showing auth state. No need for a full profile page -- the app is about destinations, not user profiles.                          | Low        | Supabase user metadata (email, avatar from Google). Dropdown with "Sign out" only.                                                        |
| **Shared wishlist via URL**                | Authenticated users get a shareable link to their wishlist that others can view (read-only). Powerful for couples/groups planning together.                           | High       | Requires public read access to specific wishlists. New RLS policy + dedicated route. Defer to post-MVP.                                   |
| **Multiple wishlists / named trips**       | "Summer 2026" vs "Backpacking Asia" -- let users organize different trip plans.                                                                                       | High       | Schema already supports it (separate `wishlists` table), but UI is complex. Defer to later milestone.                                     |
| **Offline resilience**                     | If the user loses connectivity, wishlist changes queue locally and sync when back online.                                                                             | High       | Requires service worker + background sync. Over-engineered for an MVP where the core map needs connectivity anyway. Defer.                |

## Anti-Features

Features to explicitly NOT build for this milestone. These add complexity without proportional value.

| Anti-Feature                                     | Why Avoid                                                                                                                                                                                                                                                                                   | What to Do Instead                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full user profile page**                       | Whereto is about destinations, not social profiles. A profile page implies a social platform and sets wrong expectations.                                                                                                                                                                   | Show email + sign-out in a dropdown. That's it. No avatar upload, no display name editing, no bio.                                                  |
| **Supabase anonymous sign-in**                   | Supabase offers `signInAnonymously()` which creates a real auth user. Tempting, but adds complexity: anonymous users consume auth quota, need CAPTCHA to prevent abuse, require cleanup cron jobs, and the merge flow with `linkIdentity()` is more complex than simple localStorage merge. | Keep using localStorage for anonymous users. It works, it's simple, no server cost. Merge to Supabase only when user explicitly creates an account. |
| **Password reset flow**                          | Important eventually, but for MVP the magic link IS the password reset. Users who forget passwords can use magic link to sign in and then set a new password.                                                                                                                               | Support magic link as the recovery mechanism. Add proper reset flow in a future iteration if email/password becomes the dominant auth method.       |
| **Email verification before access**             | Blocking the user until they verify email adds friction. The app works fine without auth -- no reason to gate anything behind verification.                                                                                                                                                 | Let unverified users use the app. Verify in background. Only restrict if needed later (e.g., shared wishlists).                                     |
| **Social features (comments, likes, followers)** | Travel discovery is a solo/small-group planning activity. Social features bloat the product and shift focus away from the core "where should I go?" value.                                                                                                                                  | The wishlist IS the social artifact. Sharing a URL is enough collaboration for now.                                                                 |
| **Two-factor authentication (2FA)**              | No sensitive data (no payments, no PII beyond email). 2FA adds friction with zero security benefit for this use case.                                                                                                                                                                       | Standard Supabase auth security is sufficient.                                                                                                      |
| **Admin dashboard / user management**            | No moderation needed (no UGC). User management is just Supabase dashboard.                                                                                                                                                                                                                  | Use Supabase Studio for any admin needs.                                                                                                            |
| **Rate limiting at app level**                   | Supabase already rate-limits auth endpoints. tRPC endpoints are behind auth. No public write API to abuse.                                                                                                                                                                                  | Rely on Supabase built-in rate limiting + RLS. Add app-level rate limiting only if abuse is observed.                                               |

## Feature Dependencies

```
Story 4.1: DB + tRPC setup
    |
    +---> Story 4.2: Auth (requires DB tables: profiles, wishlists)
    |         |
    |         +---> Story 4.3: Persistent wishlist (requires auth state)
    |                   |
    |                   +---> localStorage merge (part of 4.2/4.3 boundary)
    |
    +---> RLS policies (part of 4.1, verified in 4.2/4.3)

Internal feature dependencies:
  - Auth modal --> Supabase client initialized --> env vars configured
  - Optimistic updates --> TanStack Query mutations --> tRPC procedures defined
  - Session persistence --> @supabase/ssr cookie handling --> Vercel Function context
  - Merge flow --> Both localStorage read AND Supabase write working
```

## MVP Recommendation

**Prioritize (in order):**

1. **DB schema + RLS + tRPC server** (Story 4.1) -- Foundation. Nothing works without this.
2. **Auth modal with all 3 methods** (Story 4.2) -- email/password, Google OAuth, magic link. Non-blocking, triggered at "Save" action.
3. **localStorage-to-Supabase merge** (Story 4.2 acceptance criteria #4) -- The bridge between anonymous and authenticated. Most critical UX moment.
4. **Persistent wishlist CRUD** (Story 4.3) -- Authenticated users get real-time sync with optimistic updates.
5. **Account indicator + sign out** (part of 4.2) -- Visual confirmation of auth state.

**Defer:**

- **Shared wishlist via URL:** High complexity, requires new routes + RLS policies. Do after core auth is solid.
- **Multiple named wishlists:** Schema supports it, but UI is complex. Single default wishlist is sufficient for MVP.
- **Offline queue/sync:** The map itself requires connectivity. No point in offline wishlist sync without offline map.
- **Password reset flow:** Magic link covers this use case for now.

## Key UX Decisions

### When to prompt for auth

**Do:** Prompt when the user tries to add a POI to wishlist (contextual, high intent).
**Don't:** Show a login banner on page load, add a prominent "Sign up" CTA, or block any feature behind auth.

### What happens to localStorage after login

**Do:** Merge (union) localStorage items into Supabase, then clear localStorage.
**Don't:** Silently discard localStorage items, or keep dual storage running.

### What happens on logout

**Do:** Clear both Zustand store and localStorage. Clean slate.
**Don't:** Keep wishlist items in localStorage after logout (privacy concern -- shared/public computers).

### Error handling for auth flows

**Do:** Show clear, specific error messages. "Magic link expired, request a new one." "Google sign-in was cancelled."
**Don't:** Show generic "Something went wrong" or silently fail.

## Sources

- [Supabase Anonymous Sign-Ins docs](https://supabase.com/docs/guides/auth/auth-anonymous) -- anonymous user conversion and merge patterns
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- security policies for user data
- [SPA Authentication Best Practices](https://dev.indooroutdoor.io/authentication-patterns-and-best-practices-for-spas) -- OAuth and session patterns
- [Magic Links UX and Security](https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025) -- magic link pitfalls and considerations
- [Login & Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide) -- modern auth UX patterns
- [Wanderlog vs TripIt comparison](https://wanderlog.com/blog/2024/11/26/wanderlog-vs-tripit/) -- travel app feature landscape
- [Offline Sync Conflict Resolution Patterns](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) -- merge strategies for local-to-server sync
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) -- security and scaling
