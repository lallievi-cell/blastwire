# BLASTWIRE — Design Pillars & Architecture Context

## Core Identity
- **Genre:** Tactical Demolition Roguelite built on Minesweeper logic.
- **Core Twist:** Mines are ammunition, not just obstacles. Deduce mines, wire them with geometric demolition modules in an intentional firing order, and detonate escalating chain reactions to clear the Sector Quota.
- **Zero-Leak Logic Integrity:** Live salvo estimates, arc/prism previews, crystal placement, and hover projections must NEVER peek at `cell.isMine`. Every deduction remains 100% fair.

## Module Architecture
- `src/types/` — Strict domain interfaces (`Cell`, `ModuleId`, `ChassisId`, `Relic`, `DetonationEvent`, `SalvoBreakdown`, `RunState`).
- `src/data/` — Declarative catalogs: modules, 18 relics, 3 chassis loadouts, 6 campaign sectors + endless scaling + visual biomes, escalating shop upgrades.
- `src/engine/` — 100% pure deterministic game logic (ZERO DOM/window imports):
  - `prng.ts` — Seeded Mulberry32 PRNG and human-readable run seeds (`BW-XXXX-XX`).
  - `BoardGenerator.ts` — Fair board generation (hotspots, non-leaking crystals, armor, EMP scramble, Boss Omega Core).
  - `MinesweeperLogic.ts` — Neighbor counts, flood reveal, smart chord, over-flagging checks, sonar scan.
  - `DetonationResolver.ts` — Pure step-by-step chain resolution emitting `DetonationEvent[]`, plus exact fair `SalvoBreakdown` estimator.
  - `RunState.ts` — Run lifecycle, wiring, undo/reverse wire order, active Boss ticks, escalating shop economy, anti-exploit & anti-softlock checks.
- `src/tutorial/` — Data-driven 4-step interactive tutorial on a deterministic 5x5 grid.
- `src/fx/` — Zero-DOM-thrashing Canvas 2D FX engine (cached cell centers, double-core lightning, prism deflections, shockwaves, debris, crater embers, hit-stop).
- `src/audio/` — Tone.js procedural synth + adaptive tension drone + persisted mute preference.
- `src/ui/` — Persistent DOM BoardView (dirty-cell diffing + event delegation), HUD, Balatro-style Formula Bar, Ordnance Dock, Modals, Relic Trigger-Pop strip, DetonationPlayer.
- `src/styles/` — Bespoke Tactile Ordnance Vanilla CSS design system with 6 sector biome palettes.
