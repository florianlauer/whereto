# Code Style & Conventions

## Naming
- **Files:** Components → PascalCase.tsx, Hooks → use*.ts, Lib → camelCase.ts, Stores → camelCase.ts
- **Directories:** kebab-case for component groups, `__tests__/` co-located with source
- **Functions:** camelCase, React components PascalCase
- **Variables:** camelCase, constants UPPER_SNAKE_CASE, booleans is*/has* prefix
- **Types:** PascalCase, use `type` (not `interface`), Props defined as `type Props = { ... }`

## Formatting
- 2-space indentation
- Single quotes
- No semicolons
- Trailing commas in multiline structures
- No Prettier/ESLint — TypeScript strict mode is the quality gate

## Imports
1. React imports
2. Third-party libraries
3. Internal `@/` alias imports (cross-directory)
4. Relative imports (same directory)
5. CSS imports last

- Named exports only (no default exports)
- `import type` for type-only imports
- No barrel files — import directly from source

## Component Structure
1. Imports
2. Constants (UPPER_SNAKE_CASE)
3. Type definitions
4. Named export function component
5. Helper components at bottom (not exported)

## State Management
- Global: Zustand store (`src/stores/appStore.ts`), use individual selectors
- URL: TanStack Router search params + Zod validation (filters live in URL)
- Local: React useState for UI state

## Error Handling
- Fetch: check `response.ok`, throw descriptive Error
- React ErrorBoundary wraps entire app
- Early returns for missing data
- No try/catch in app code — errors propagate to boundary

## Comments
- Mix of French and English
- UI text is French
- No JSDoc/TSDoc
