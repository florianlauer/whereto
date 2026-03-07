---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                |
| ---------------------- | ------------------------------------ |
| **Framework**          | vitest                               |
| **Config file**        | none — Wave 0 installs               |
| **Quick run command**  | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run --reporter=verbose` |
| **Estimated runtime**  | ~10 seconds                          |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | ----------------- | ----------- | ---------- |
| 01-01-01 | 01   | 1    | INFRA-01    | integration | `pnpm vitest run` | ❌ W0       | ⬜ pending |
| 01-01-02 | 01   | 1    | INFRA-01    | integration | `pnpm vitest run` | ❌ W0       | ⬜ pending |
| 01-02-01 | 02   | 1    | INFRA-02    | integration | `pnpm vitest run` | ❌ W0       | ⬜ pending |
| 01-02-02 | 02   | 1    | INFRA-03    | integration | `pnpm vitest run` | ❌ W0       | ⬜ pending |
| 01-02-03 | 02   | 1    | INFRA-04    | unit        | `pnpm vitest run` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install test framework
- [ ] `tests/setup.ts` — shared test setup
- [ ] `tests/api/` — stubs for tRPC endpoint tests
- [ ] `tests/db/` — stubs for database/RLS tests

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                               | Requirement | Why Manual                       | Test Instructions                                                 |
| -------------------------------------- | ----------- | -------------------------------- | ----------------------------------------------------------------- |
| RLS policies block unauthorized access | INFRA-01    | Requires Supabase auth context   | Test via Supabase dashboard SQL editor with different auth tokens |
| Vercel deployment serves tRPC          | INFRA-02    | Requires live deployment         | Deploy and curl `/api/trpc/health`                                |
| Service role key not in bundle         | INFRA-04    | Requires build output inspection | Run `pnpm build && grep -r SUPABASE_SERVICE_ROLE dist/`           |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
