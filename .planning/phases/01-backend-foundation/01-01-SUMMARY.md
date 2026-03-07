---
phase: 01-backend-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, migrations]

# Dependency graph
requires: []
provides:
  - "Database schema with profiles, wishlists, wishlist_items tables"
  - "RLS policies restricting users to their own data"
  - "Auto-creation trigger for profile + default wishlist on signup"
  - "Generated TypeScript types (database.types.ts)"
  - "Supabase local dev environment via devenv.nix"
  - "Seed data for local development"
affects: [01-02-api-skeleton, 02-auth, 03-wishlist-crud]

# Tech tracking
tech-stack:
  added: [supabase-cli, supabase-local]
  patterns: [rls-policy-pattern, trigger-based-auto-creation, devenv-nix-tooling]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/00001_initial_schema.sql
    - supabase/seed.sql
    - src/lib/database.types.ts
  modified:
    - devenv.nix
    - package.json

key-decisions:
  - "Supabase CLI installed via devenv.nix (not npm) for system-level tool management"
  - "Single migration file for initial schema (profiles + wishlists + wishlist_items + RLS + triggers)"
  - "SECURITY DEFINER trigger for handle_new_user to bypass RLS during auto-creation"

patterns-established:
  - "RLS policy pattern: use (select auth.uid()) wrapper for performance"
  - "Auto-creation pattern: trigger on auth.users INSERT creates profile + default wishlist"
  - "Type generation: supabase gen types typescript --local piped to src/lib/database.types.ts"

requirements-completed: [INFRA-01, INFRA-03]

# Metrics
duration: 15min
completed: 2026-03-07
---

# Phase 1 Plan 01: Supabase Schema Summary

**Supabase local dev with profiles/wishlists/wishlist_items schema, RLS policies, auto-creation trigger, and generated TypeScript types**

## Performance

- **Duration:** ~15 min (across two sessions with human checkpoint)
- **Started:** 2026-03-07T19:30:00Z
- **Completed:** 2026-03-07T21:15:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Full database schema with three tables (profiles, wishlists, wishlist_items) and RLS enabled
- Auto-creation trigger fires on auth.users INSERT, creating profile + default wishlist
- Seed data with test users and sample wishlist items loaded
- TypeScript types generated from schema with `db:types` script in package.json
- Supabase linked to cloud project with .env configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Supabase local dev and create database schema migration** - `053f00c` (feat)
2. **Task 2: Link Supabase cloud project and configure env vars** - checkpoint:human-action (user action)
3. **Task 3: Generate TypeScript types from schema and add db:types script** - `ae458b4` (feat)

## Files Created/Modified

- `devenv.nix` - Added supabase-cli to nix packages
- `supabase/config.toml` - Supabase local configuration
- `supabase/migrations/00001_initial_schema.sql` - Full schema: tables, RLS policies, triggers
- `supabase/seed.sql` - Test data with sample users and wishlist items
- `src/lib/database.types.ts` - Generated TypeScript types for all tables
- `package.json` - Added db:types script

## Decisions Made

- Supabase CLI installed via devenv.nix rather than npm -- keeps system tools in nix, app dependencies in npm
- Single migration file for entire initial schema -- simpler for greenfield project
- SECURITY DEFINER on handle_new_user trigger -- required to bypass RLS during auto-creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleaned Docker pull output from generated types file**

- **Found during:** Task 3
- **Issue:** First `supabase gen types` run included Docker pull logs in stdout, polluting the generated .ts file
- **Fix:** Re-ran with stderr redirected (`2>/dev/null`) to produce clean TypeScript output
- **Files modified:** src/lib/database.types.ts
- **Verification:** File starts with `export type Json =`, no Docker output
- **Committed in:** ae458b4 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor output issue, no scope creep.

## Issues Encountered

- Docker pull output mixed into generated types on first run -- resolved by redirecting stderr

## User Setup Required

Task 2 required manual user action:

- Linked Supabase CLI to cloud project via `supabase link --project-ref`
- Created .env file with SUPABASE*URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and VITE* prefixed equivalents

## Next Phase Readiness

- Schema foundation complete, ready for API skeleton (plan 01-02)
- TypeScript types available for type-safe database access
- Local Supabase running with seed data for development

---

_Phase: 01-backend-foundation_
_Completed: 2026-03-07_
