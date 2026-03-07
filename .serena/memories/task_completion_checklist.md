# Task Completion Checklist

When a coding task is completed, run through these checks:

## Required

1. **Type check:** `bun run type` — must pass with no errors
2. **Tests:** `bun run test` — all tests must pass
3. **Build:** `bun run build` — verify production build succeeds (if changes affect build)

## Code Quality

- Follow existing naming conventions (see style_and_conventions memory)
- Use named exports only (no default exports)
- Use `type` not `interface` for TypeScript types
- Use `@/` alias for cross-directory imports
- No semicolons, single quotes, 2-space indent

## Notes

- No linter configured — rely on TypeScript strict mode
- No auto-formatter — maintain consistent style manually
- Do NOT commit automatically — user manages git manually
