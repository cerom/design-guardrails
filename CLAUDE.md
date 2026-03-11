# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

design-guardrails is a CLI that enforces design system rules on AI coding agents via hooks. It analyzes TSX/JSX files using the TypeScript AST, detects violations (wrong HTML elements, raw hex colors), and returns structured feedback so the agent self-corrects.

## Commands

- `npm run build` — compile TypeScript (`tsc`, outputs to `dist/`)
- `npm test` — run Jest tests
- `npm test -- --testPathPattern=analyzer` — run a single test file
- `npm run dev` — run CLI in development via tsx

## Architecture

**Entry points:**
- `src/cli.ts` — CLI interface (`npx design-guardrails`). Commands: `check` (analyze files) and `init` (print starter config).
- `src/hooks/claude-code.ts` — Claude Code hook entry point. Reads hook input from stdin, analyzes the written file, returns allow/deny JSON to stdout.

**Core:**
- `src/analyzer.ts` — `CodeAnalyzer` walks the TypeScript AST to detect two violation types: element violations (e.g. `<button>` instead of `<Button>`) and token violations (e.g. raw `#ffffff` instead of a design token).
- `src/formatter.ts` — `ViolationFormatter` outputs violations in three formats: Claude Code feedback (colored terminal), JSON, and summary line.
- `src/types/config.ts` — `GuardrailsConfig` type and `defineConfig` helper. Config maps HTML elements to design system components and raw values to token names.

**Config resolution:** Both `cli.ts` and `hooks/claude-code.ts` look for `guardrails.config.{js,ts}` or `.guardrails.{js,ts}` in the project root.

## Publishing

Pushing to `main` with a bumped `package.json` version triggers automatic npm publish and GitHub Release creation via `.github/workflows/publish.yml`. If the version hasn't changed, only build+test runs. Requires `NPM_TOKEN` secret in GitHub repo settings.

## Module system

Uses CommonJS (`"module": "commonjs"` in tsconfig). Imports use `.js` extensions for cross-compatibility.
