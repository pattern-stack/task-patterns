# Repository Guidelines

## Project Structure & Module Organization
- `src/atoms/`: low-level types, validators, config, utilities.
- `src/features/`: domain services, schemas, transformers (e.g., issue, team).
- `src/molecules/`: API facades and workflows.
- `src/organisms/`: CLI surface (`cli/` and `commands/`).
- `src/__tests__/`: unit/integration tests and setup.
- `bin/tp.js`: published CLI entry; `dist/`: compiled output.
- Docs live in `docs/`, `ai_docs/`, and top-level `*.md` references.

## Build, Test, and Development Commands
- `npm run dev`: watch/reload TypeScript entry (`src/index.ts`).
- `npm run build`: compile to `dist/` via `tsc`.
- `npm start`: run built entry (`dist/index.js`).
- `npm run cli`: run the CLI in dev (`src/organisms/cli/index.ts`).
- `tp` (or `task-pattern`): installed CLI binary from `bin/tp.js`.
- `npm test` / `npm run test:watch` / `npm run test:coverage`: run Jest.
- `npm run test:unit` / `npm run test:integration`: targeted suites.
- `npm run typecheck` / `lint` / `lint:fix` / `format` / `format:check`.
- `npm run verify`: typecheck + lint + tests.

## Coding Style & Naming Conventions
- Language: TypeScript. Formatting via Prettier (2 spaces, semicolons, single quotes, trailing commas, width 100).
- Linting: ESLint + @typescript-eslint + Prettier. Key rules: `prefer-const`, `eqeqeq`, `curly`, `no-floating-promises` (error), limited `console` (CLI commands allow).
- Paths: prefer aliases in tests (`@atoms/`, `@features/`, `@molecules/`, `@organisms/`).
- Files: tests mirror source structure; use descriptive names (e.g., `issue.service.ts`).

## Testing Guidelines
- Framework: Jest with `ts-jest`. Tests in `src/**/__tests__/**` and `*.test.ts`.
- Coverage thresholds: branches 70, functions 80, lines 80, statements 80.
- Run examples: `npm test`, or focused: `npm run test:unit`.
- Add tests for new CLI commands under `src/organisms/__tests__/cli`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`. Optional scope with task ID, e.g., `feat(TASK-11): add enhanced CLI`.
- PRs: include clear description, linked issue/task, relevant screenshots or CLI output, and notes on configuration.
- CI: ensure `npm run verify` passes and coverage meets thresholds.

## Security & Configuration
- Copy `.env.sample` to `.env` and set `LINEAR_API_KEY`. Never commit secrets.
- Prefer `src/atoms/config/local-config.ts` and hierarchical config for safe local overrides.
