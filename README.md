# BLASTWIRE — Tactical Demolition Roguelite

Minesweeper inverted into a geometric demolition roguelite: deduce where the mines are, wire them in an intentional firing order (`#1 → #N`), and detonate escalating chain reactions to shatter the Sector Quota and defeat active Sector Bosses.

Play it: https://lallievi-cell.github.io/blastwire/

## Highlights (v3.0)
- **Zero-Leak Logic Integrity:** Live Balatro-style salvo formulas (`Base × Locale × Catena`), Arc/Prism projections, and Crystal generation never peek at hidden mines.
- **Wire Ordering & Geometric Chains:** Wire `#1 → #N` badges, `Undo` (`Z`), `Inverti #` (`R`), 6 explosive modules (`C4`, `Ponte Arco`, `Carica Croce`, `Amplificatore`, `Deviascintilla / Prisma 90°`, `Estrattore / Sifone`) + `Sonar 3×3`.
- **3 Playable Chassis:** `M-01 Demolitore`, `V-04 Ingegnere Tesla`, `R-09 Ricognitore` with distinct loadouts and passives.
- **6 Campaign Sectors + Endless Mode:** Distinct visual biomes, active Boss mechanics (`S3 Il Bastione` armor ticks, `S6 Nucleo Omega` core target), 18 synergistic relics with live trigger-pops, escalating Tactical Shop, and shareable deterministic Run Seeds.
- **Procedural Adaptive Audio & Zero-Thrash Canvas FX:** Tone.js layered synth + tension drone, cached-geometry Canvas 2D lightning/shockwaves/crater embers, hit-stop, and `1× / 2×` animation speed toggle.

## Development
```bash
npm install
npm run dev      # Start Vite dev server
npm test         # Run Vitest pure-engine test suite
npm run build    # Type-check and build production bundle into dist/
```

The original single-file prototype is preserved in [`_prototype/blastwire.html`](./_prototype/blastwire.html).
