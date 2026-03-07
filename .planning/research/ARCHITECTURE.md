# Architecture Patterns

**Domain:** Adding backend infrastructure (Supabase + tRPC + Hono) to an existing client-side-only Vite React SPA
**Researched:** 2026-03-07

## Recommended Architecture

### System Overview

The architecture adds a thin backend layer to an existing SPA without disrupting the current client-side-only flows. The core principle from the BMAD architecture holds: **zero network post-load for the main flow** (map, filters, scoring). Network is introduced only for user operations (auth, wishlist persistence).

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (unchanged core)                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Vite SPA — React 19 + TanStack Router                 │  │
│  │                                                         │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │  │
│  │  │ Map/Filters  │  │ Zustand   │  │ TanStack Query    │  │  │
│  │  │ (unchanged)  │  │ (anon     │  │ (auth wishlist    │  │  │
│  │  │ deck.gl +    │  │  wishlist │  │  only, via tRPC)  │  │  │
│  │  │ MapLibre     │  │  in LS)   │  │                   │  │  │
│  │  └─────────────┘  └──────────┘  └────────┬──────────┘  │  │
│  │                                           │ tRPC client │  │
│  └───────────────────────────────────────────┼─────────────┘  │
│                                               │                │
│  ┌────────────────────────────────────────────┼────────────┐  │
│  │  Supabase JS Client (browser)              │            │  │
│  │  - Auth only (signIn, signOut, onAuthStateChange)       │  │
│  │  - Provides JWT for tRPC Authorization header           │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────┼────────────────┘
                                                │ HTTPS
                    ┌───────────────────────────▼──────────────┐
                    │  Vercel Function: /api/trpc/*             │
                    │  Hono app + @hono/trpc-server middleware  │
                    │                                          │
                    │  createContext():                         │
                    │    - Extracts JWT from Authorization hdr  │
                    │    - Calls supabase.auth.getUser(jwt)     │
                    │    - Returns { user, supabase }           │
                    │                                          │
                    │  appRouter:                               │
                    │    - wishlist.get (protectedProcedure)     │
                    │    - wishlist.sync (protectedProcedure)    │
                    │    - wishlist.add (protectedProcedure)     │
                    │    - wishlist.remove (protectedProcedure)  │
                    └───────────────────────────┬──────────────┘
                                                │ Supabase SDK
                                                │ (service role)
                    ┌───────────────────────────▼──────────────┐
                    │  Supabase                                │
                    │  - PostgreSQL: profiles, wishlists,       │
                    │    wishlist_items (with RLS)              │
                    │  - Auth: magic link, Google OAuth,        │
                    │    email/password                         │
                    └──────────────────────────────────────────┘
```

### Component Boundaries

| Component                        | Responsibility                                          | Communicates With                                     | New/Existing                        |
| -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| **Vite SPA**                     | Map, filters, scoring, UI panels                        | Static JSON (CDN), Zustand, tRPC client               | Existing (modified)                 |
| **Zustand Store**                | Static data cache + anonymous wishlist (localStorage)   | Components read/write                                 | Existing (extended with auth state) |
| **Supabase JS Client (browser)** | Auth flows only (signIn, signOut, session listener)     | Supabase Auth API, provides JWT to tRPC client        | **New**                             |
| **tRPC Client**                  | Type-safe API calls for wishlist CRUD                   | Hono/tRPC server via HTTP                             | **New**                             |
| **TanStack Query**               | Server state cache for authenticated wishlist           | tRPC client (uses query/mutation options)             | **New**                             |
| **Hono + tRPC Server**           | API entry point, auth verification, wishlist procedures | Supabase DB (service role)                            | **New**                             |
| **Supabase PostgreSQL**          | Persistent storage: profiles, wishlists, wishlist_items | Only accessed by Hono server                          | **New**                             |
| **Supabase Auth**                | User management, JWT issuance                           | Browser client (PKCE flow), server (JWT verification) | **New**                             |

### Data Flow

#### Flow 1: Main App (unchanged -- no backend)

```
Browser loads SPA → fetch static JSON from CDN → Zustand stores data
User adjusts filters → URL params update → scoring recalculates → map re-renders
User clicks country → DestinationPanel opens → POIs shown from in-memory data
```

No changes needed. This flow remains 100% client-side.

#### Flow 2: Anonymous Wishlist (unchanged)

```
User toggles POI → Zustand addToWishlist() → localStorage persists
User opens TripSummaryPanel → reads from Zustand → shows grouped POIs
```

No changes needed. Anonymous users never hit the backend.

#### Flow 3: Auth Flow (new)

```
1. User clicks "Save" on wishlist → AuthModal opens
2. User chooses method (magic link / Google OAuth / email+password)
3. Supabase JS client handles PKCE flow:
   - Magic link: supabase.auth.signInWithOtp({ email })
   - OAuth: supabase.auth.signInWithOAuth({ provider: 'google' })
   - Email/password: supabase.auth.signUp() or signInWithPassword()
4. On success: supabase.auth.onAuthStateChange() fires
5. Auth state stored in Zustand (user object + session)
6. JWT extracted from session, attached to tRPC client headers
```

#### Flow 4: Wishlist Sync at Login (new -- critical path)

```
1. Auth succeeds → onAuthStateChange fires with SIGNED_IN event
2. Read localStorage wishlist items from Zustand
3. If items exist:
   a. Call wishlist.sync tRPC mutation with localStorage items
   b. Server upserts items into Supabase DB (deduplicated by wishlist_id + poi_id)
   c. On success: clear localStorage wishlist
4. Fetch server wishlist: wishlist.get tRPC query
5. Update Zustand with server-sourced wishlist
6. From now on: all wishlist mutations go through tRPC
```

#### Flow 5: Authenticated Wishlist CRUD (new)

```
User toggles POI:
  → tRPC wishlist.add mutation → server inserts into wishlist_items
  → TanStack Query invalidates wishlist.get → UI updates from server state

User removes POI:
  → tRPC wishlist.remove mutation → server deletes from wishlist_items
  → TanStack Query invalidates → UI updates

User opens TripSummaryPanel:
  → TanStack Query cache for wishlist.get → renders server-sourced items
```

#### Flow 6: Logout (new)

```
1. supabase.auth.signOut()
2. Clear Zustand auth state (user = null)
3. Clear Zustand wishlist items (don't keep server data in localStorage)
4. tRPC client stops sending Authorization header
5. App falls back to anonymous mode
```

## Key Integration Points

### Integration Point 1: Supabase Auth in Browser + JWT to tRPC

The browser Supabase client handles auth flows. The JWT is extracted and forwarded to the tRPC server via the Authorization header. This is the critical bridge between Supabase Auth and tRPC.

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

```typescript
// src/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { AppRouter } from "@/server/routers";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      async headers() {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return {};
        return { Authorization: `Bearer ${session.access_token}` };
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
```

**Confidence:** HIGH -- this pattern is documented across tRPC official docs and Supabase guides. The `httpBatchLink` `headers` function is async and called per-request batch, so it always gets a fresh JWT.

**Security note:** Use `getSession()` on the client side (it reads from local storage, acceptable in browser). The server must verify with `getUser(jwt)` which hits Supabase Auth API to validate the token is not revoked.

### Integration Point 2: Hono + tRPC Server with Supabase Context

The Hono app mounts the tRPC middleware. The `createContext` function extracts the JWT, verifies it server-side, and provides the authenticated Supabase client to procedures.

```typescript
// api/trpc/[[...trpc]].ts  (Vercel Function catch-all)
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "../../src/server/routers";
import { createContext } from "../../src/server/context";

const app = new Hono();

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (opts, c) => createContext(opts, c),
  }),
);

export default app;
```

```typescript
// src/server/context.ts
import { createClient } from "@supabase/supabase-js";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context as HonoContext } from "hono";

export async function createContext(opts: FetchCreateContextFnOptions, honoCtx: HonoContext) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const authHeader = opts.req.headers.get("Authorization");
  if (!authHeader) return { user: null, supabase };

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return { user: error ? null : user, supabase };
}
```

**Confidence:** MEDIUM -- `@hono/trpc-server` passes the Hono context as the second argument to `createContext`. Verified on npm docs. The exact TypeScript types for the second argument may need checking against the installed version.

### Integration Point 3: Vercel Deployment -- SPA + API Cohabitation

The Vite SPA builds to `dist/` (static files). The Hono API lives in `api/` and deploys as Vercel Functions. Both coexist via `vercel.json` rewrites.

```json
// vercel.json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/trpc/(.*)", "destination": "/api/trpc/[[...trpc]]" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

**File structure for Vercel Functions:**

```
whereto/
├── api/
│   └── trpc/
│       └── [[...trpc]].ts    ← Hono + tRPC, catch-all Vercel Function
├── src/                       ← Vite SPA source (builds to dist/)
│   ├── server/                ← tRPC router + context (imported by api/)
│   │   ├── context.ts
│   │   ├── trpc.ts            ← initTRPC, middleware, protectedProcedure
│   │   └── routers/
│   │       ├── index.ts       ← appRouter = mergeRouters(wishlistRouter)
│   │       └── wishlist.ts
│   ├── lib/
│   │   ├── supabase.ts        ← Browser Supabase client
│   │   └── trpc.ts            ← tRPC client + TanStack Query setup
│   └── ...
├── dist/                      ← Vite build output (SPA assets)
├── vercel.json
└── package.json
```

**Confidence:** MEDIUM -- Vercel's catch-all `[[...trpc]]` pattern with Hono is documented but the exact rewrite syntax for colocating a Vite SPA with an API function needs testing. The alternative is simpler file-based routing at `api/index.ts` with a single rewrite `{ "source": "/api/(.*)", "destination": "/api" }`.

**Important:** The `src/server/` directory contains code that runs on the server (imported by `api/`), not in the browser. Vite tree-shaking ensures it is not bundled into the client build because no client code imports from `src/server/`. However, this should be verified -- if Vite attempts to resolve these imports, move server code to a top-level `server/` directory outside `src/`.

### Integration Point 4: Dual Wishlist State (Zustand + TanStack Query)

This is the most nuanced integration point. The app must support two modes:

- **Anonymous:** Wishlist in Zustand (localStorage)
- **Authenticated:** Wishlist in TanStack Query (Supabase via tRPC)

```typescript
// src/hooks/useWishlist.ts -- unified hook
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore"; // or auth slice in appStore
import { trpc } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useWishlist() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Anonymous: Zustand
  const anonItems = useAppStore((s) => s.wishlistItems);
  const anonAdd = useAppStore((s) => s.addToWishlist);
  const anonRemove = useAppStore((s) => s.removeFromWishlist);

  // Authenticated: tRPC + TanStack Query
  const serverQuery = useQuery({
    ...trpc.wishlist.get.queryOptions(),
    enabled: !!user,
  });

  const addMutation = useMutation({
    ...trpc.wishlist.add.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.wishlist.get.queryKey(),
      }),
  });

  const removeMutation = useMutation({
    ...trpc.wishlist.remove.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.wishlist.get.queryKey(),
      }),
  });

  if (!user) {
    return {
      items: anonItems,
      add: anonAdd,
      remove: anonRemove,
      isLoading: false,
    };
  }

  return {
    items: serverQuery.data ?? [],
    add: (item) => addMutation.mutate(item),
    remove: (poiId) => removeMutation.mutate({ poiId }),
    isLoading: serverQuery.isLoading,
  };
}
```

**Confidence:** HIGH -- this is a standard pattern. The `useWishlist` hook abstracts the dual state source, so components never need to know if they are in anonymous or authenticated mode.

### Integration Point 5: TanStack Query Provider in React Tree

TanStack Query needs a `QueryClientProvider` wrapping the app. This must be added without disrupting the existing router setup.

```typescript
// src/main.tsx (modified)
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/trpc'

// Inside the App component, wrap RouterProvider:
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>
```

**Confidence:** HIGH -- straightforward provider wrapping, no conflicts with TanStack Router.

## Patterns to Follow

### Pattern 1: Protected Procedure Middleware

**What:** A tRPC middleware that enforces authentication and narrows the context type.

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } }); // user is now non-null
});
export const router = t.router;
```

**When:** Every procedure that touches user data.

### Pattern 2: Optimistic Updates for Wishlist Mutations

**What:** Update the UI immediately before the server responds, roll back on error.

**When:** Wishlist add/remove for authenticated users -- prevents UI lag on serverless cold starts.

```typescript
const addMutation = useMutation({
  ...trpc.wishlist.add.mutationOptions(),
  onMutate: async (newItem) => {
    await queryClient.cancelQueries({ queryKey: trpc.wishlist.get.queryKey() });
    const previous = queryClient.getQueryData(trpc.wishlist.get.queryKey());
    queryClient.setQueryData(trpc.wishlist.get.queryKey(), (old) => [...(old ?? []), newItem]);
    return { previous };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(trpc.wishlist.get.queryKey(), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: trpc.wishlist.get.queryKey() });
  },
});
```

### Pattern 3: Auth State Listener with Sync Trigger

**What:** Listen to Supabase auth state changes and trigger localStorage-to-server sync on first login.

```typescript
// src/hooks/useAuthListener.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/appStore";
import { trpc } from "@/lib/trpc";
import { queryClient } from "@/lib/trpc";

export function useAuthListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Sync localStorage wishlist to server
        const localItems = useAppStore.getState().wishlistItems;
        if (localItems.length > 0) {
          await trpcClient.wishlist.sync.mutate(localItems);
          useAppStore.getState().clearWishlist(); // clear localStorage
        }
        // Invalidate to fetch merged server state
        queryClient.invalidateQueries({ queryKey: trpc.wishlist.get.queryKey() });
      }
      if (event === "SIGNED_OUT") {
        useAppStore.getState().clearWishlist();
        queryClient.clear();
      }
    });
    return () => subscription.unsubscribe();
  }, []);
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using Supabase Client Directly for DB in Browser

**What:** Calling `supabase.from('wishlist_items').select()` directly from React components.
**Why bad:** Bypasses tRPC type-safety, splits data fetching between two paradigms (TanStack Query for tRPC + raw Supabase calls), makes testing harder. RLS provides security but you lose the type-safe contract.
**Instead:** All DB operations go through tRPC procedures. Browser Supabase client is used for Auth only.

### Anti-Pattern 2: Sharing Zustand Store for Both Anonymous and Authenticated Wishlist

**What:** Storing server-fetched wishlist items back into Zustand localStorage.
**Why bad:** Creates two sources of truth. Sync conflicts when offline edits exist. localStorage becomes stale cache of server state.
**Instead:** Clean separation: Zustand = anonymous only, TanStack Query = authenticated only. The `useWishlist()` hook switches between them based on auth state.

### Anti-Pattern 3: Using `getSession()` for Server-Side Auth Verification

**What:** Calling `supabase.auth.getSession()` in the tRPC context to check auth.
**Why bad:** `getSession()` reads from local storage/cookies and does NOT verify the JWT with Supabase Auth servers. A revoked session would still appear valid.
**Instead:** Always use `supabase.auth.getUser(token)` on the server, which makes a network call to verify the JWT is still valid.

### Anti-Pattern 4: Putting Server Code in `src/` Without Verifying Tree-Shaking

**What:** Importing `@supabase/supabase-js` with service role key in `src/server/` and assuming Vite won't bundle it.
**Why bad:** If any client code accidentally imports from `src/server/`, the service role key leaks into the browser bundle.
**Instead:** Verify no client imports reach `src/server/`. Consider moving server code to a top-level `server/` directory outside `src/` if unsure. Environment variables without `VITE_` prefix are not exposed to the client, which provides a safety net for the service role key even if code is bundled.

## Suggested Build Order

Dependencies between components dictate the implementation sequence:

```
Phase 1: Foundation (no UI changes)
  ├── Supabase project setup (DB schema, RLS, Auth config)
  ├── Server code: tRPC router + Hono + context
  └── Vercel deployment config (vercel.json, env vars)

Phase 2: Client Integration (minimal UI)
  ├── Supabase JS client (browser, auth only)
  ├── tRPC client + TanStack Query setup
  ├── QueryClientProvider in React tree
  └── useAuthListener hook

Phase 3: Auth UI
  ├── AuthModal component (magic link + OAuth + email/password)
  ├── Auth state in store (user, loading)
  └── Login/logout buttons in UI

Phase 4: Wishlist Migration
  ├── useWishlist() unified hook
  ├── localStorage → server sync on first login
  ├── Update DestinationPanel to use useWishlist()
  ├── Update TripSummaryPanel to use useWishlist()
  └── Optimistic updates for authenticated mutations
```

**Rationale:**

- Phase 1 has no frontend dependencies -- can be tested with curl/Postman
- Phase 2 adds plumbing but no visible UI changes -- low risk
- Phase 3 adds auth UI -- can be tested independently of wishlist
- Phase 4 is the integration phase where anonymous and authenticated modes merge -- highest complexity, needs prior phases stable

## Scalability Considerations

| Concern                       | Current (< 100 users)   | At 10K users                               | At 100K users                                         |
| ----------------------------- | ----------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Vercel Functions cold starts  | Negligible              | ~200ms first request                       | Consider Vercel Fluid Compute (auto)                  |
| Supabase DB connections       | Free tier (direct)      | Connection pooling via Supavisor           | Pro plan required ($25/mo)                            |
| Auth token verification       | 1 call per tRPC request | Consider caching verified tokens (TTL 60s) | Move to edge verification                             |
| Static data (countries, POIs) | CDN-cached, no concern  | No concern                                 | No concern                                            |
| Wishlist data volume          | Tiny (< 50 items/user)  | No concern                                 | Index on user_id + poi_id (already unique constraint) |

## Sources

- [tRPC v11 TanStack React Query Setup](https://trpc.io/docs/client/tanstack-react-query/setup) -- HIGH confidence, official docs
- [tRPC Adapters](https://trpc.io/docs/server/adapters) -- HIGH confidence, official docs
- [@hono/trpc-server npm](https://www.npmjs.com/package/@hono/trpc-server) -- MEDIUM confidence, third-party middleware
- [Hono on Vercel](https://hono.dev/docs/getting-started/vercel) -- HIGH confidence, official Hono docs
- [Vercel Hono Framework Docs](https://vercel.com/docs/frameworks/backend/hono) -- HIGH confidence, official Vercel docs
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- HIGH confidence, official docs
- [Supabase getUser vs getSession](https://supabase.com/docs/reference/javascript/auth-getsession) -- HIGH confidence, official docs
- [Supabase + tRPC Integration Patterns](https://dev.to/chrislydemann/handling-authentication-with-supabase-analog-and-trpc-27f0) -- MEDIUM confidence, community article
- [Vite + Vercel SPA Routing](https://tone-row.com/blog/vite-vercel-client-side-routing-serverless-api) -- MEDIUM confidence, community article

---

_Architecture research: 2026-03-07_
