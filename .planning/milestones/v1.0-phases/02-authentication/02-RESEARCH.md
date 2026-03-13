# Phase 2: Authentication - Research

**Researched:** 2026-03-07
**Domain:** Supabase Auth + React client-side integration + tRPC auth context
**Confidence:** HIGH

## Summary

This phase implements three auth methods (email/password, magic link, Google OAuth) using Supabase Auth, which is already configured in the project. The client-side Supabase JS SDK (`@supabase/supabase-js@2.98`) handles all auth flows natively -- no additional libraries needed. The critical challenge is the `onAuthStateChange` deadlock pitfall (flagged in STATE.md) and preserving URL filters across OAuth redirects.

The existing infrastructure from Phase 1 provides: Supabase client helpers (`src/server/db.ts` with `createSupabaseClient(accessToken)`), tRPC context (`src/server/trpc.ts`), and the app shell with Zustand + TanStack Router. Phase 2 adds a client-side Supabase instance, an auth store, a modal UI, and tRPC middleware for authenticated procedures.

**Primary recommendation:** Use `@supabase/supabase-js` client directly (already installed). Create a Zustand auth slice with `onAuthStateChange` listener (NO async in callback). Build an auth modal triggered only on "Save to wishlist" actions. Pass the Supabase access token via Authorization header to tRPC for server-side user resolution.

<phase_requirements>

## Phase Requirements

| ID      | Description                                                         | Research Support                                                                                       |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| AUTH-01 | User peut creer un compte avec email et password                    | `signInWithPassword` + `signUp` from `@supabase/supabase-js` -- standard Supabase Auth flow            |
| AUTH-02 | User peut se connecter via magic link email                         | `signInWithOtp({ email, options: { emailRedirectTo } })` -- sends magic link by default                |
| AUTH-03 | User peut se connecter via Google OAuth                             | `signInWithOAuth({ provider: 'google' })` -- requires Google Cloud Console + Supabase dashboard config |
| AUTH-04 | Session persistante via refresh token                               | Built-in: Supabase JS stores session in localStorage by default, auto-refreshes tokens                 |
| AUTH-05 | Auth proposee au moment du "Save", jamais en gate sur la carte      | UI pattern: auth modal triggered by wishlist save action, not route guard                              |
| AUTH-06 | Option "Continuer sans compte" toujours visible dans la modale auth | Modal UI design: dismiss button always present, returns to anonymous mode                              |
| AUTH-07 | Apres OAuth redirect, les filtres URL sont preserves                | Pass current URL search params in `redirectTo` option of `signInWithOAuth`                             |

</phase_requirements>

## Standard Stack

### Core

| Library                  | Version | Purpose                                              | Why Standard                                          |
| ------------------------ | ------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `@supabase/supabase-js`  | ^2.98.0 | Auth client (signIn, signUp, signOut, session)       | Already installed, provides all auth methods natively |
| `zustand`                | ^5      | Auth state management (user, session, loading)       | Already the project's state manager                   |
| `@tanstack/react-router` | ^1      | URL-based filter preservation across OAuth redirects | Already in use, search params are the source of truth |

### Supporting

| Library  | Version | Purpose                                   | When to Use                                        |
| -------- | ------- | ----------------------------------------- | -------------------------------------------------- |
| `sonner` | ^2.0.7  | Toast notifications for auth feedback     | Already installed, use for "Check your email" etc. |
| `zod`    | ^3      | Form validation for email/password inputs | Already installed                                  |

### Alternatives Considered

| Instead of         | Could Use     | Tradeoff                                                                      |
| ------------------ | ------------- | ----------------------------------------------------------------------------- |
| Zustand auth slice | React Context | Zustand is already used, adding Context creates a second state paradigm       |
| Custom auth modal  | Radix Dialog  | Radix Dialog is fine for the modal shell, but the auth logic stays in Zustand |

**Installation:**

```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── supabase.ts           # Client-side Supabase instance (VITE_ env vars)
│   └── trpc.ts               # Existing tRPC client (add auth headers)
├── stores/
│   ├── appStore.ts            # Existing app store (keep as-is)
│   └── authStore.ts           # NEW: auth state (user, session, loading, actions)
├── components/
│   └── auth/
│       ├── AuthModal.tsx      # Modal with tabs: email/password, magic link, Google
│       ├── EmailPasswordForm.tsx
│       ├── MagicLinkForm.tsx
│       └── OAuthButton.tsx
├── server/
│   ├── trpc.ts               # UPDATE: extract user from Authorization header
│   ├── middleware.ts          # NEW: auth middleware (protectedProcedure)
│   └── db.ts                 # Existing, already has createSupabaseClient(token)
└── hooks/
    └── useAuthModal.ts        # NEW: open/close modal state, trigger on save
```

### Pattern 1: Client-Side Supabase Instance

**What:** Single browser-side Supabase client for auth operations
**When to use:** All client-side auth calls (signIn, signUp, signOut, onAuthStateChange)
**Example:**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Source: https://supabase.com/docs/guides/auth/quickstarts/react

### Pattern 2: Auth Store with onAuthStateChange (DEADLOCK-SAFE)

**What:** Zustand store that listens to auth events without async in callback
**When to use:** App initialization, session tracking
**Example:**

```typescript
// src/stores/authStore.ts
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

type AuthStore = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => () => void; // returns unsubscribe
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    // Listen for changes -- NO async/await in callback!
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will set user/session to null
  },
}));
```

Source: https://supabase.com/docs/reference/javascript/auth-onauthstatechange

### Pattern 3: tRPC Auth Context from Authorization Header

**What:** Extract Supabase access token from request headers in tRPC context
**When to use:** All tRPC procedures that need authenticated user
**Example:**

```typescript
// src/server/trpc.ts (updated)
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { supabaseAdmin, createSupabaseClient } from "./db";

export function createContext({ req }: FetchCreateContextFnOptions) {
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  return {
    supabaseAdmin,
    supabaseUser: createSupabaseClient(accessToken),
    accessToken,
  };
}

// Protected procedure middleware
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const {
    data: { user },
    error,
  } = await ctx.supabaseUser.auth.getUser();
  if (error || !user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

### Pattern 4: tRPC Client with Auth Headers

**What:** Inject access token into tRPC httpBatchLink headers
**When to use:** Every tRPC call from authenticated client
**Example:**

```typescript
// In main.tsx, update trpcClient creation
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers: () => {
        const session = useAuthStore.getState().session;
        if (session?.access_token) {
          return { authorization: `Bearer ${session.access_token}` };
        }
        return {};
      },
    }),
  ],
});
```

### Pattern 5: OAuth Redirect with URL Preservation (AUTH-07)

**What:** Encode current search params into redirectTo so filters survive OAuth redirect
**When to use:** Google OAuth sign-in
**Example:**

```typescript
async function signInWithGoogle() {
  // Capture current URL with all search params (filters)
  const currentUrl = window.location.href;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: currentUrl,
    },
  });
  if (error) console.error("OAuth error:", error);
}
```

Source: https://supabase.com/docs/reference/javascript/auth-signinwithoauth

### Pattern 6: Auth Modal Triggered on Save (AUTH-05, AUTH-06)

**What:** Modal appears only when anonymous user tries to save; never gates map
**When to use:** Wishlist "save" action when user is not authenticated
**Example:**

```typescript
// Hook pattern
function useAuthGatedAction() {
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.open);

  return (action: () => void) => {
    if (user) {
      action();
    } else {
      openAuthModal(action); // store the pending action for after auth
    }
  };
}
```

### Anti-Patterns to Avoid

- **Async/await inside onAuthStateChange callback:** Causes deadlock. Use `setTimeout(..., 0)` if you must dispatch async work, or better yet keep the callback synchronous (just `set()` state).
- **Route guards for auth:** Do NOT create auth-required routes or redirect to login. The map is always accessible. Auth is only triggered by save-to-wishlist.
- **Storing session manually in localStorage:** Supabase JS already persists the session in localStorage and auto-refreshes tokens. Do NOT duplicate this.
- **Using `getSession()` for user verification on server:** `getSession()` reads from localStorage and can be tampered with. On the server, always use `getUser()` which validates the JWT with Supabase Auth servers.

## Don't Hand-Roll

| Problem                   | Don't Build                       | Use Instead                                    | Why                                                                 |
| ------------------------- | --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Session persistence       | Custom localStorage token manager | Supabase JS built-in persistence               | Handles refresh tokens, expiry, cross-tab sync automatically        |
| OAuth flow                | Custom PKCE implementation        | `signInWithOAuth()`                            | Complex crypto, redirect handling, token exchange                   |
| JWT validation on server  | Manual JWT decode/verify          | `supabase.auth.getUser()` with user's token    | Handles key rotation, expiry, revocation checks                     |
| Email/password validation | Custom password rules             | Supabase Auth config `minimum_password_length` | Centralized, consistent enforcement                                 |
| Magic link throttling     | Rate limiting logic               | Supabase Auth built-in rate limits             | Already configured in config.toml (1 email/second dev, 2/hour prod) |

**Key insight:** Supabase Auth handles the entire auth lifecycle. The only custom code needed is: (1) UI forms, (2) state management bridge (Zustand), (3) tRPC middleware to extract tokens.

## Common Pitfalls

### Pitfall 1: onAuthStateChange Deadlock

**What goes wrong:** App hangs, auth state never resolves, all subsequent Supabase calls block forever.
**Why it happens:** Using `async/await` inside the `onAuthStateChange` callback causes Supabase's internal lock to never release.
**How to avoid:** Keep the callback synchronous. Only call `set()` on Zustand state. If you need async work (like fetching profile), do it in a `useEffect` that reacts to `user` state changing.
**Warning signs:** App freezes after login, no errors in console, network requests pending indefinitely.
Source: https://github.com/supabase/auth-js/issues/762

### Pitfall 2: OAuth Redirect Loses URL State

**What goes wrong:** User signs in with Google, comes back to the app root `/` without their filters.
**Why it happens:** Not passing the current URL (with search params) as `redirectTo` in `signInWithOAuth`.
**How to avoid:** Always pass `window.location.href` as `redirectTo`. Ensure the URL pattern is in Supabase's redirect allow list.
**Warning signs:** After Google login, URL is just `/` without filter query params.

### Pitfall 3: Using getSession() on Server Side

**What goes wrong:** Security vulnerability -- tampered tokens accepted.
**Why it happens:** `getSession()` reads from local storage without server-side validation. On the server, the "local storage" is the token from the header, which could be forged.
**How to avoid:** Always use `supabase.auth.getUser()` on the server which validates the token against Supabase Auth servers.
**Warning signs:** RLS policies bypassed, unauthorized data access.

### Pitfall 4: OAuth Callback URL Not Configured

**What goes wrong:** Google OAuth fails with redirect_uri_mismatch error.
**Why it happens:** The redirect URL in Supabase dashboard / Google Cloud Console doesn't match the actual app URL (especially on Vercel preview deployments).
**How to avoid:** Add wildcard patterns in Supabase redirect allow list: `https://*-yourteam.vercel.app/**` for Vercel previews. Configure both localhost and production URLs.
**Warning signs:** Error on Google consent screen or after redirect.
Source: https://supabase.com/docs/guides/auth/redirect-urls

### Pitfall 5: Email Confirmation Blocking Login

**What goes wrong:** Users can't sign in after signup because email confirmation is required.
**Why it happens:** `enable_confirmations = true` in Supabase auth config.
**How to avoid:** Currently `enable_confirmations = false` in config.toml (correct for MVP). Keep it disabled or implement a confirmation flow.
**Warning signs:** Users sign up but get "Email not confirmed" errors.

### Pitfall 6: Hono Context Type Mismatch

**What goes wrong:** TypeScript errors when updating `createContext` to accept request headers.
**Why it happens:** The `@hono/trpc-server` adapter passes context differently than standard tRPC adapters.
**How to avoid:** Check the `@hono/trpc-server` adapter's `createContext` signature -- it provides `(opts: { req: Request })` compatible with Hono's request object. Test with `req.header("authorization")` (Hono) vs `req.headers.get("authorization")` (standard fetch).
**Warning signs:** TypeScript errors in `createContext`, undefined `req` object.

## Code Examples

### Sign Up with Email/Password (AUTH-01)

```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signup
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securepassword",
});

if (error) {
  // Handle: "User already registered", weak password, etc.
  toast.error(error.message);
} else {
  toast.success("Compte cree avec succes !");
}
```

### Sign In with Email/Password (AUTH-01)

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  toast.error("Email ou mot de passe incorrect");
}
// onAuthStateChange will fire SIGNED_IN and update the store
```

### Sign In with Magic Link (AUTH-02)

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: window.location.href, // preserve current URL
  },
});

if (error) {
  toast.error(error.message);
} else {
  toast.success("Lien magique envoye ! Verifiez votre boite mail.");
}
```

### Sign In with Google OAuth (AUTH-03)

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: window.location.href, // AUTH-07: preserve filters
  },
});
```

### Sign Out

```typescript
await supabase.auth.signOut();
// onAuthStateChange will fire SIGNED_OUT
// Zustand store resets user/session to null
```

### Auth-aware tRPC Call with Header Injection

```typescript
// In main.tsx httpBatchLink headers callback
headers: () => {
  const session = useAuthStore.getState().session;
  return session?.access_token
    ? { authorization: `Bearer ${session.access_token}` }
    : {};
},
```

## State of the Art

| Old Approach                    | Current Approach            | When Changed               | Impact                                       |
| ------------------------------- | --------------------------- | -------------------------- | -------------------------------------------- |
| Implicit OAuth flow             | PKCE flow (default in v2)   | supabase-js v2             | More secure, no tokens in URL hash           |
| `getSession()` for verification | `getUser()` for server-side | 2024 advisory              | Security: prevents tampered token acceptance |
| `onAuthStateChange` with async  | Sync-only callbacks         | Known since auth-js v2.60+ | Prevents deadlock (documented pitfall)       |

**Deprecated/outdated:**

- `supabase.auth.session()` (v1 API): Use `supabase.auth.getSession()` (v2)
- Implicit flow OAuth: PKCE is now default and recommended

## Open Questions

1. **Google OAuth Credentials**
   - What we know: Need Google Cloud Console project + OAuth client ID + redirect URIs
   - What's unclear: Whether Florian already has a Google Cloud project for this app
   - Recommendation: Create during implementation, document the steps. For local dev, use Supabase's built-in InBucket for email testing

2. **Vercel Preview Deployment Redirect URLs**
   - What we know: Wildcards work (`https://*-team.vercel.app/**`)
   - What's unclear: The exact Vercel team/account slug for wildcard pattern
   - Recommendation: Configure in Supabase dashboard during implementation, use `window.location.origin` dynamically

3. **Auth Modal Pending Action Pattern**
   - What we know: Modal should store a "pending action" to execute after auth
   - What's unclear: Whether this should be in the auth store or a separate modal store
   - Recommendation: Separate `useAuthModalStore` with `{ isOpen, pendingAction, open, close }` -- keeps auth state clean

## Validation Architecture

### Test Framework

| Property           | Value                                          |
| ------------------ | ---------------------------------------------- |
| Framework          | Vitest 3 + @testing-library/react 16           |
| Config file        | `vitest.config.ts` (exists, jsdom environment) |
| Quick run command  | `bun run test`                                 |
| Full suite command | `bun run test`                                 |

### Phase Requirements to Test Map

| Req ID  | Behavior                                              | Test Type | Automated Command                                                                   | File Exists? |
| ------- | ----------------------------------------------------- | --------- | ----------------------------------------------------------------------------------- | ------------ |
| AUTH-01 | signUp + signInWithPassword calls Supabase correctly  | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "email"`                 | -- Wave 0    |
| AUTH-02 | signInWithOtp sends magic link                        | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "magic"`                 | -- Wave 0    |
| AUTH-03 | signInWithOAuth calls with Google provider            | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "google"`                | -- Wave 0    |
| AUTH-04 | Session persists (getSession returns cached session)  | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "session"`               | -- Wave 0    |
| AUTH-05 | Auth modal opens only on save action, not on map load | unit      | `bunx vitest run src/components/auth/__tests__/AuthModal.test.tsx`                  | -- Wave 0    |
| AUTH-06 | "Continuer sans compte" button visible and functional | unit      | `bunx vitest run src/components/auth/__tests__/AuthModal.test.tsx -t "sans compte"` | -- Wave 0    |
| AUTH-07 | redirectTo includes current search params             | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "redirect"`              | -- Wave 0    |

### Sampling Rate

- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/stores/__tests__/authStore.test.ts` -- covers AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07 (mock supabase.auth methods)
- [ ] `src/components/auth/__tests__/AuthModal.test.tsx` -- covers AUTH-05, AUTH-06
- [ ] Mock helper: `src/lib/__mocks__/supabase.ts` -- shared Supabase client mock for tests

## Sources

### Primary (HIGH confidence)

- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) -- client setup, onAuthStateChange, signIn patterns
- [signInWithOAuth API](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) -- OAuth params, PKCE, redirectTo
- [signInWithOtp API](https://supabase.com/docs/reference/javascript/auth-signinwithotp) -- magic link params, emailRedirectTo
- [onAuthStateChange API](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) -- event types, async deadlock warning
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google) -- config.toml, Google Console setup
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) -- allow list, wildcards for Vercel

### Secondary (MEDIUM confidence)

- [auth-js deadlock issue #762](https://github.com/supabase/auth-js/issues/762) -- confirmed async callback deadlock, setTimeout workaround
- [tRPC Authorization docs](https://trpc.io/docs/server/authorization) -- middleware pattern for protected procedures

### Tertiary (LOW confidence)

- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all libraries already installed, official docs verified
- Architecture: HIGH -- patterns directly from Supabase official docs + existing codebase analysis
- Pitfalls: HIGH -- deadlock issue confirmed by official docs + GitHub issues, other pitfalls from official troubleshooting

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain, Supabase v2 APIs are mature)
