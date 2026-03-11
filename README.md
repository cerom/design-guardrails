# design-guardrails

AI coding agents don't follow design systems reliably. Prompt instructions like CLAUDE.md and AGENTS.md are suggestions — agents drift from them mid-session.

design-guardrails installs hooks that give your agent deterministic feedback every time it writes code that violates your design system.

`<button>` → "use `<Button>` from `@/components/ui/button`"
`#63g5fh` → "use token `text-secondary`"

The agent reads the feedback, self-corrects, and moves on. No manual intervention.

## How it works

```
npx design-guardrails
```

The CLI asks you a few questions about your project, then generates two things:

1. **A rules file** — maps raw elements and values to your design system components and tokens
1. **Agent hooks** — wires the rules into your AI coding tool so they run automatically on every file write

After setup, you never touch the CLI again. The hooks run silently in the background and steer the agent when needed.

## Setup

```bash
npx design-guardrails
```

Follow the prompts. The CLI will:

- Detect your framework
- Ask which components and tokens to enforce
- Generate a `guardrails.config.ts` in your project root
- Install hooks for your agent (Claude Code supported first)

## Config

The CLI generates this for you, but you can edit it manually:

```ts
// guardrails.config.ts
import { defineConfig } from 'design-guardrails';

export default defineConfig({
  include: ['src/**/*.tsx'],
  rules: {
    elements: {
      button: { use: 'Button', from: '@/components/ui/button' },
      input:  { use: 'Input',  from: '@/components/ui/input' },
      a:      { use: 'Link',   from: '@/components/ui/link' },
    },
    tokens: {
      '#63g5fh': 'text-secondary',
      '#ffffff': 'bg-background',
    }
  }
});
```

## What the agent sees

When a hook triggers, the agent gets feedback like:

```
design-guardrails: 2 violations in src/components/Header.tsx

  line 12: <button> → use <Button> from @/components/ui/button
  line 24: #63g5fh → use token "text-secondary"
```

The agent fixes the violations and continues.

## Why not just use CLAUDE.md?

|                                   |Prompt instructions|design-guardrails|
|-----------------------------------|-------------------|-----------------|
|Deterministic                      |No                 |Yes              |
|Catches every violation            |No                 |Yes              |
|Works mid-session when agent drifts|No                 |Yes              |
|Zero manual feedback needed        |No                 |Yes              |

## Roadmap

- [x] CLI setup flow
- [x] Element mapping rules (`<button>` → `<Button>`)
- [x] Token mapping rules (hex → token name)
- [x] Claude Code hooks integration
- [ ] Auto-discovery: point at a component directory, infer rules automatically
- [ ] Presets for popular design systems (shadcn, MUI, Radix)
- [ ] Cursor / Windsurf support
- [ ] `--fix` mode for CI (auto-correct without an agent)

## License

MIT