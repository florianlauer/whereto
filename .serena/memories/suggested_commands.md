# Suggested Commands

## Development

```bash
bun run dev          # Start Vite dev server (with 8GB Node heap)
bun run build        # TypeScript check + Vite production build
bun run preview      # Preview production build locally
```

## Type Checking

```bash
bun run type         # TypeScript type-check only (tsc --noEmit)
```

## Testing

```bash
bun run test         # Run tests once (vitest run)
bun run test:watch   # Run tests in watch mode (vitest)
```

## Dependencies

```bash
bun add <package>       # Add a runtime dependency
bun add -d <package>    # Add a dev dependency
bun install             # Install all dependencies
```

## System Utilities (Darwin)

```bash
git status / git diff / git log   # Version control
ls / find / grep                  # File system exploration
trash <file>                      # Delete files (preferred over rm)
```

## Notes

- No ESLint or Prettier configured — formatting is manual/editor-based
- No dedicated lint command
- TypeScript strict mode serves as the primary code quality check
