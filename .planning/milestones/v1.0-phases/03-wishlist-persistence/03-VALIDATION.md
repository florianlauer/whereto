---
phase: 3
slug: wishlist-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| **Framework**          | vitest (via `vitest.config.ts`)                             |
| **Config file**        | `vitest.config.ts` (jsdom environment, globals, `@/` alias) |
| **Quick run command**  | `bun run test`                                              |
| **Full suite command** | `bun run test`                                              |
| **Estimated runtime**  | ~10 seconds                                                 |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run type`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                      | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ------------------------------------------------------ | ----------- | ---------- |
| 03-01-01 | 01   | 1    | WISH-01     | unit      | `bun run test src/server/__tests__/wishlist.test.ts`   | ❌ W0       | ⬜ pending |
| 03-02-01 | 02   | 1    | WISH-05     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ❌ W0       | ⬜ pending |
| 03-02-02 | 02   | 1    | WISH-06     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/server/__tests__/wishlist.test.ts` — stubs for WISH-01 (tRPC router unit tests with mocked Supabase)
- [ ] `src/hooks/__tests__/useWishlist.test.ts` — stubs for WISH-05, WISH-06 (hook behavior with mocked stores/tRPC)
- [ ] No framework gaps — vitest + testing-library already configured

---

## Manual-Only Verifications

| Behavior                                      | Requirement | Why Manual            | Test Instructions                                   |
| --------------------------------------------- | ----------- | --------------------- | --------------------------------------------------- |
| Wishlist visible in Supabase Studio after add | WISH-01     | Requires real DB      | Add item while authenticated, check Supabase Studio |
| Cross-device wishlist sync                    | WISH-06     | Requires multi-device | Login on different browser, verify same wishlist    |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
