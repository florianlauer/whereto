# Project Retrospective

_A living document updated after each milestone. Lessons feed forward into future planning._

## Milestone: v1.0 — Auth + Persistence

**Shipped:** 2026-03-13
**Phases:** 4 | **Plans:** 9 | **Sessions:** ~8

### What Was Built

- Supabase DB schema with RLS, auto-creation triggers, and type generation
- tRPC + Hono API on Vercel Functions with typed client
- Auth (email/password, magic link, Google OAuth) with non-blocking UX
- Unified useWishlist() hook abstracting localStorage vs server
- localStorage-to-server merge on login with deduplication
- Optimistic updates with snapshot-rollback, logout cleanup

### What Worked

- Strictly linear phase ordering (INFRA → AUTH → CRUD → SYNC) — each phase built cleanly on the previous
- TDD approach: failing tests first, then implementation — caught issues early
- Fire-and-forget tRPC mutations via useTRPCClient — clean separation from React lifecycle
- YOLO mode with automatic verification — fast execution without losing quality checks
- Average plan execution: 6 minutes — high velocity throughout

### What Was Inefficient

- useAuthGatedAction built in Phase 2 but never wired into production components — gap only caught at milestone audit
- Phase 2 verification marked AUTH-05 SATISFIED based on hook existence + tests, missing the integration check
- Phase-level verification is insufficient for cross-phase integration — need milestone-level integration checks earlier
- Some ROADMAP.md checkboxes not updated during execution (Phase 2 still unchecked, Phase 3/4 plans unchecked)

### Patterns Established

- Snapshot-before-mutation for optimistic updates (capture state, restore in .catch())
- Cross-store communication via getState() for synchronous operations
- Sync-only onAuthStateChange callbacks to avoid Supabase deadlocks
- Soft auth gating: action always executes, auth modal suggested after N anonymous actions
- sessionStorage for per-tab ephemeral counters

### Key Lessons

1. Phase verification must include cross-phase integration checks, not just within-phase functionality
2. Hook existence + unit tests ≠ production integration — always verify imports in consumer components
3. Auth gating should be non-blocking for anonymous-first apps — gate = suggest, not block
4. Split complex domains (wishlist CRUD vs sync) into separate phases — reduces cognitive load per phase

### Cost Observations

- Model mix: balanced profile (opus for planning, sonnet for execution)
- Sessions: ~8
- Notable: 53 minutes total execution for 9 plans — extremely fast for a full backend layer

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change                                     |
| --------- | -------- | ------ | ---------------------------------------------- |
| v1.0      | ~8       | 4      | First GSD milestone — established all patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Tech Debt Items |
| --------- | ----- | -------- | --------------- |
| v1.0      | 105   | —        | 3               |

### Top Lessons (Verified Across Milestones)

1. Cross-phase integration gaps are the #1 risk — phase-level verification is necessary but not sufficient
2. Non-blocking auth UX is critical for anonymous-first apps
