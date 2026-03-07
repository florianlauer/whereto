---
phase: 2
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                          |
| ---------------------- | ---------------------------------------------- |
| **Framework**          | Vitest 3 + @testing-library/react 16           |
| **Config file**        | `vitest.config.ts` (exists, jsdom environment) |
| **Quick run command**  | `bun run test`                                 |
| **Full suite command** | `bun run test`                                 |
| **Estimated runtime**  | ~10 seconds                                    |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                                                   | File Exists | Status  |
| -------- | ---- | ---- | ----------- | --------- | ----------------------------------------------------------------------------------- | ----------- | ------- |
| 02-01-01 | 01   | 1    | AUTH-01     | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "email"`                 | W0          | pending |
| 02-01-02 | 01   | 1    | AUTH-02     | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "magic"`                 | W0          | pending |
| 02-01-03 | 01   | 1    | AUTH-03     | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "google"`                | W0          | pending |
| 02-01-04 | 01   | 1    | AUTH-04     | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "session"`               | W0          | pending |
| 02-02-01 | 02   | 1    | AUTH-05     | unit      | `bunx vitest run src/components/auth/__tests__/AuthModal.test.tsx`                  | W0          | pending |
| 02-02-02 | 02   | 1    | AUTH-06     | unit      | `bunx vitest run src/components/auth/__tests__/AuthModal.test.tsx -t "sans compte"` | W0          | pending |
| 02-01-05 | 01   | 1    | AUTH-07     | unit      | `bunx vitest run src/stores/__tests__/authStore.test.ts -t "redirect"`              | W0          | pending |

_Status: pending / green / red / flaky_

---

## Wave 0 Requirements

- [ ] `src/stores/__tests__/authStore.test.ts` — stubs for AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07 (mock supabase.auth methods)
- [ ] `src/components/auth/__tests__/AuthModal.test.tsx` — stubs for AUTH-05, AUTH-06
- [ ] `src/lib/__mocks__/supabase.ts` — shared Supabase client mock for tests

---

## Manual-Only Verifications

| Behavior                                   | Requirement | Why Manual                                          | Test Instructions                                                                                                |
| ------------------------------------------ | ----------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Google OAuth full redirect flow            | AUTH-03     | Requires real Google credentials + browser redirect | 1. Click "Google" in auth modal 2. Complete Google sign-in 3. Verify redirect back to app with filters preserved |
| Magic link email delivery                  | AUTH-02     | Requires real email delivery                        | 1. Enter email in magic link form 2. Check inbox for link 3. Click link, verify session created                  |
| Session persistence across browser restart | AUTH-04     | Requires browser close/reopen                       | 1. Sign in 2. Close browser completely 3. Reopen and navigate to app 4. Verify still signed in                   |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
