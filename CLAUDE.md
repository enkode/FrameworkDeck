# Framework Deck — Agent Instructions

## Gemini CLI Consultation Protocol (MANDATORY)

Gemini CLI (`gemini`) is installed globally as a second-opinion consultant. You MUST use it actively as part of your standard workflow — not as a last resort.

### When to Consult (automatic, no user prompt needed)
1. **Any bug that doesn't resolve on first attempt** — before trying a second fix, ask Gemini
2. **Recurring issues** — if you've seen a similar error before, consult immediately
3. **Architecture/implementation decisions** — when starting new features, get Gemini's recommended approach WHILE you plan yours
4. **Complex debugging** — when root cause isn't obvious after reading the error + relevant code
5. **Build/config failures** — Tauri, Vite, TypeScript, CSP, plugin registration issues
6. **CSS/layout issues** — zoom, viewport units, grid/flex overflow, cross-platform rendering

### How to Call
```bash
# Basic consultation
gemini -p "I need your expert opinion on: [DETAILED DESCRIPTION]. Relevant code: [CODE]. What's the best approach?"

# With file context (preferred)
gemini -p "Review this file and advise on [ISSUE]: $(cat app/src/modules/SomeModule.tsx)"

# Multi-file context
gemini -p "Working on [TASK]. Files:
--- file1.tsx ---
$(cat app/src/file1.tsx)
--- file2.ts ---
$(cat app/src/file2.ts)
---
[QUESTION]"
```

### Rules
- **READ-ONLY** — Gemini must NEVER modify files. Ask for guidance only.
- **Full context** — Always include complete error messages, relevant code, and what you've tried.
- **Iterate until consensus** — Follow up with clarifying questions until you and Gemini agree on the approach.
- **Document consensus** — Note what was decided before implementing.
- **No shortcuts** — Even if consulting adds time, it prevents recurring issues that never get fixed.
- **Active, not reactive** — Consult Gemini SIMULTANEOUSLY with your own analysis, not just when stuck.

## Project Structure
- `app/` — React 18 + TypeScript + Vite + Tailwind + Tauri 2 desktop app
- `repo/framework-control/` — Rust backend service (git submodule, port 8090)
- Design: JetBrains Mono, 4 themes (reel/phosphor/amber/framework), digital oscilloscope aesthetic
- Font scaling: `fs()` helper in `src/utils/font.ts`, CSS `zoom` for UI scaling
- State: Zustand with localStorage persistence (`framework-deck-prefs`)

## Key Patterns
- All inline `fontSize` must use `fs(N)` helper, never raw pixel values
- Tailwind arbitrary sizes handled by CSS overrides in `index.css`
- Canvas `ctx.font` is exempt from `fs()` (canvas has its own coordinate system)
- Tauri plugins must be registered in BOTH `Cargo.toml` AND `lib.rs`
- Use `width: 100%` / `height: 100%` — never `100vw`/`100vh` (breaks with CSS zoom)
