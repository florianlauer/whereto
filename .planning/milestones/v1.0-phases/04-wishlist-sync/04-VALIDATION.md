---
phase: 4
slug: wishlist-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                           |
| ---------------------- | ------------------------------- |
| **Framework**          | Vitest + @testing-library/react |
| **Config file**        | `vitest.config.ts` (root)       |
| **Quick run command**  | `bun run test`                  |
| **Full suite command** | `bun run test`                  |
| **Estimated runtime**  | ~10 seconds                     |

---

## Sampling Rate

- **After every task commit:** Run `bun run test src/hooks/__tests__/useWishlist.test.ts`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                      | File Exists          | Status     |
| -------- | ---- | ---- | ----------- | --------- | ------------------------------------------------------ | -------------------- | ---------- |
| 04-01-01 | 01   | 1    | WISH-02     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new tests) | ⬜ pending |
| 04-01-02 | 01   | 1    | WISH-02     | unit      | `bun run test src/server/__tests__/wishlist.test.ts`   | ✅ (needs new test)  | ⬜ pending |
| 04-01-03 | 01   | 1    | WISH-03     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)  | ⬜ pending |
| 04-01-04 | 01   | 1    | WISH-03     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)  | ⬜ pending |
| 04-02-01 | 02   | 1    | WISH-04     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)  | ⬜ pending |
| 04-02-02 | 02   | 1    | WISH-04     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)  | ⬜ pending |
| 04-03-01 | 03   | 1    | WISH-07     | unit      | `bun run test src/stores/__tests__/authStore.test.ts`  | ✅ (needs new test)  | ⬜ pending |
| 04-03-02 | 03   | 1    | WISH-07     | unit      | `bun run test src/stores/__tests__/appStore.test.ts`   | ✅ (existing test)   | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New test cases are added to existing test files, not new files.

---

## Manual-Only Verifications

| Behavior                                        | Requirement | Why Manual                                      | Test Instructions                                                                     |
| ----------------------------------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Full anonymous→signup→merge flow                | WISH-02     | End-to-end browser flow with real Supabase auth | 1. Add items anonymously 2. Sign up 3. Verify all items appear in server wishlist     |
| Network failure during merge keeps localStorage | WISH-03     | Requires simulating network failure mid-request | 1. Add items anonymously 2. Throttle network 3. Login 4. Verify localStorage retained |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
