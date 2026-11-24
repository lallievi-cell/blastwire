import type { LayoutPattern, RelicId, ToolId } from '../types/game';

export const MODULE_ICONS: Record<ToolId, string> = {
  dig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L18.5 9.5M4 20l6.5-6.5m2-8L20 12l-2.5 2.5L10 7l2.5-1.5z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3v18h2.2v-7h9.5l-2.1-4 2.1-4H8.2V3H6z"/></svg>`,
  c4: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="7" width="16" height="12" rx="2.5" fill="currentColor" fill-opacity="0.22"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><circle cx="12" cy="13" r="2.3" fill="currentColor"/></svg>`,
  arc: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 11-12h-6l-1-8z"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.5h4v7.5h7.5v4H14v7.5h-4V14H2.5v-4H10V2.5z"/></svg>`,
  amp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><polygon points="12 2 22 12 12 22 2 12 12 2" fill="currentColor" fill-opacity="0.22"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
  prism: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17h10V7" /><path d="M10 7h8v8" opacity="0.45"/><polygon points="14 14 20 14 14 20" fill="currentColor" fill-opacity="0.3"/><circle cx="14" cy="14" r="2.2" fill="currentColor"/></svg>`,
  siphon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7" fill="currentColor" fill-opacity="0.18"/><path d="M12 6v12M8.5 14.5L12 18l3.5-3.5M8.5 9.5L12 6l3.5 3.5"/></svg>`,
  sonar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M16.2 7.8a6 6 0 010 8.4M7.8 16.2a6 6 0 010-8.4M19 5a10 10 0 010 14M5 19A10 10 0 015 5"/></svg>`,
};

export const TILE_ICONS = {
  armor: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#181c24" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.5L6.5 8v4.2c0 3.4 2.3 6.4 5.5 7.3 3.2-.9 5.5-3.9 5.5-7.3V8L12 5.5z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>`,
  wall: `<svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="2.5" width="19" height="19" rx="2.5" fill="#12161f" stroke="#495469" stroke-width="1.6"/><path d="M5 5l14 14M19 5L5 19" stroke="#2c3545" stroke-width="2.4" stroke-linecap="round"/><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="#1d2432" stroke="#57647d" stroke-width="1.3"/><circle cx="5.5" cy="5.5" r="1.35" fill="#9aa6bc"/><circle cx="18.5" cy="5.5" r="1.35" fill="#9aa6bc"/><circle cx="5.5" cy="18.5" r="1.35" fill="#9aa6bc"/><circle cx="18.5" cy="18.5" r="1.35" fill="#9aa6bc"/></svg>`,
  barrel: `<svg viewBox="0 0 24 24" fill="none"><rect x="5.5" y="3" width="13" height="18" rx="3" fill="#9e2416" stroke="#ff9b54" stroke-width="1.6"/><rect x="5.8" y="8.2" width="12.4" height="7.6" fill="#ffd15c" fill-opacity="0.22"/><path d="M5.5 8h13M5.5 16h13" stroke="#ffbe55" stroke-width="1.5"/><path d="M12 8.6c1.9 1.7 2.7 3 2.7 4.2a2.7 2.7 0 11-5.4 0c0-1.2.8-2.5 2.7-4.2z" fill="#ffd466"/><path d="M12 10.8c.9.9 1.3 1.6 1.3 2.2a1.3 1.3 0 11-2.6 0c0-.6.4-1.3 1.3-2.2z" fill="#ff5430"/></svg>`,
  crystal: `<svg viewBox="0 0 24 24" fill="none"><polygon points="12 2.5 16.5 9.5 14.5 20.5 9.5 20.5 7.5 9.5" fill="#48d1f0" fill-opacity="0.45" stroke="#aef0ff" stroke-width="1.5" stroke-linejoin="round"/><polygon points="6.5 8.5 10 12 8.8 19.5 4.5 16.5" fill="#38bdf8" fill-opacity="0.35" stroke="#7dd3fc" stroke-width="1.2" stroke-linejoin="round"/><polygon points="17.5 9.5 19.5 16.5 15.2 19.5 14 12.5" fill="#67e8f9" fill-opacity="0.35" stroke="#a5f3fc" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 2.5v18" stroke="#e0faff" stroke-width="1" stroke-opacity="0.7"/></svg>`,
  hotspot: `<svg viewBox="0 0 24 24" fill="none"><polygon points="12 2.5 20.5 12 12 21.5 3.5 12" fill="#f59e0b" fill-opacity="0.32" stroke="#ffd466" stroke-width="1.8"/><polygon points="12 6.5 16.8 12 12 17.5 7.2 12" fill="#ffd466" fill-opacity="0.55"/></svg>`,
  crater: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.5" fill="#2a110e" stroke="#ff6238" stroke-opacity="0.45" stroke-width="1.3" stroke-dasharray="3 2"/><path d="M12 7.5l1.2 3.2 3.3.8-2.7 2 1 3.2-2.8-1.8-2.8 1.8 1-3.2-2.7-2 3.3-.8L12 7.5z" fill="#ff6a3d" fill-opacity="0.34"/><circle cx="12" cy="12" r="2" fill="#ff944d" fill-opacity="0.65"/></svg>`,
  bastionReticle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="3.4" stroke-width="1.7"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  omegaCore: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#ff3b28" fill-opacity="0.24" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="5.5" stroke="#ffd466" stroke-width="1.4" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="3" fill="#ff6b4a"/><circle cx="12" cy="12" r="1.4" fill="#fff7ed"/><path d="M12 1.8v3.2M12 19v3.2M1.8 12H5M19 12h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  sonarPing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5" stroke-dasharray="3 2.2" opacity="0.85"/><circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity="0.18"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>`,
};

export const UI_ICONS = {
  shield: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>`,
  armor_plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fill="currentColor" fill-opacity="0.16"/><path d="M12 8v8M8 12h8"/></svg>`,
  moves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L18.5 9.5M4 20l6-6m2.5-9.5L20 12l-2.5 2.5L10 7l2.5-2.5z"/></svg>`,
  volumeOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.2"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/></svg>`,
  volumeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.2"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>`,
  reverse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>`,
  disarm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  detonate: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-5.2 9.5a6.5 6.5 0 012.7-4.8l1.6 2.7a3.5 3.5 0 00-1.3 2.1H6.8zm10.4 0h-3a3.5 3.5 0 00-1.3-2.1l1.6-2.7a6.5 6.5 0 012.7 4.8z"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
};

export const RELIC_ICONS: Record<RelicId, string> = {
  resonance_3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.14"/><circle cx="12" cy="12" r="5" stroke-dasharray="3 2"/><path d="M10 9.5h4l-2 2.3a2 2 0 11-2 2.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  domino: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="7" height="14" rx="1.5" fill="currentColor" fill-opacity="0.18"/><rect x="13" y="5" width="7" height="14" rx="1.5" transform="rotate(14 16.5 12)" fill="currentColor" fill-opacity="0.28"/><circle cx="6.5" cy="9" r="1" fill="currentColor"/><circle cx="6.5" cy="15" r="1" fill="currentColor"/></svg>`,
  arc_diag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 20L11 13l-2-2 11-7-7 11-2-2-7 7z" fill="currentColor" fill-opacity="0.22"/></svg>`,
  border_hunter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
  kinetic_shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.5L4.5 5.5v6c0 4.7 3.2 9 7.5 10 4.3-1 7.5-5.3 7.5-10v-6L12 2.5z" fill="currentColor" fill-opacity="0.2"/><path d="M9 12l2 2 4-4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  surgical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.14"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>`,
  gold_mine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 3 20 8 20 16 12 21 4 16 4 8 12 3" fill="currentColor" fill-opacity="0.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>`,
  thermal_amp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 12 12 22 2 12 12 2" fill="currentColor" fill-opacity="0.18"/><polygon points="12 6.5 17.5 12 12 17.5 6.5 12 12 6.5" fill="currentColor" fill-opacity="0.35"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  cross_reach: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v20M2 12h20"/><path d="M9.5 4.5L12 2l2.5 2.5M9.5 19.5L12 22l2.5-2.5M4.5 9.5L2 12l2.5 2.5M19.5 9.5L22 12l-2.5 2.5"/></svg>`,
  auto_wire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 5.5v6c0 4.8 3.2 9.1 8 10.5 4.8-1.4 8-5.7 8-10.5v-6L12 2z" fill="currentColor" fill-opacity="0.18"/><path d="M13 7l-4 5.5h3.5L11 17l4.5-6H12l1-4z" fill="currentColor" stroke="none"/></svg>`,
  unstable_core: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3c2.5 3.4 5 5.4 5 9a5 5 0 11-10 0c0-2.1 1-4.1 2.4-5.7.3 1.7 1.3 2.5 2.6 2.7-.2-2 .1-4 0-6z" fill="currentColor" fill-opacity="0.28"/></svg>`,
  fast_drill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19L19 5M14 5h5v5M5 12l7-7M12 19l7-7"/></svg>`,
  seismic_wake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="6" opacity="0.8"/><circle cx="12" cy="12" r="9.5" stroke-dasharray="3 2" opacity="0.55"/></svg>`,
  hotspot_master: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2.5 19.8 7 19.8 17 12 21.5 4.2 17 4.2 7 12 2.5" fill="currentColor" fill-opacity="0.22"/><path d="M12 7l1.6 3.4L17 12l-3.4 1.6L12 17l-1.6-3.4L7 12l3.4-1.6L12 7z" fill="currentColor"/></svg>`,
  armor_piercer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fill-opacity="0.16"/><path d="M4 13l5-3 3 4 4-5 4 3"/></svg>`,
  seismic_echo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>`,
  regen_siphon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.16"/><path d="M12 8v8M8 12h8"/></svg>`,
  chain_overdrive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a4 4 0 010-5.6l2-2a4 4 0 115.6 5.6l-1 1"/><path d="M14 11a4 4 0 010 5.6l-2 2a4 4 0 11-5.6-5.6l1-1"/></svg>`,
};

/**
 * Generates a miniature 7x7 tactical SVG blueprint preview of a sector layout
 * showing steel walls and accent focal points so players see room geometry before descending.
 */
export function renderLayoutBlueprintSvg(layout: LayoutPattern): string {
  const size = 7;
  const wallSet = new Set<string>();
  const addWall = (r: number, c: number) => wallSet.add(`${r},${c}`);

  if (layout === 'pillars') {
    addWall(1, 1); addWall(1, 5);
    addWall(5, 1); addWall(5, 5);
  } else if (layout === 'crossroads') {
    addWall(1, 3); addWall(5, 3);
    addWall(3, 1); addWall(3, 5);
  } else if (layout === 'vault') {
    addWall(2, 2); addWall(2, 4);
    addWall(4, 2); addWall(4, 4);
  } else if (layout === 'corridors') {
    addWall(2, 1); addWall(2, 2);
    addWall(2, 4); addWall(2, 5);
    addWall(4, 1); addWall(4, 2);
    addWall(4, 4); addWall(4, 5);
  } else if (layout === 'reactor') {
    addWall(1, 1); addWall(1, 5);
    addWall(5, 1); addWall(5, 5);
    addWall(0, 3); addWall(6, 3);
  }

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = 3 + c * 9;
      const y = 3 + r * 9;
      const isWall = wallSet.has(`${r},${c}`);
      const isCenterCore = layout === 'reactor' && r === 3 && c === 3;
      if (isCenterCore) {
        rects += `<rect x="${x}" y="${y}" width="7" height="7" rx="1.6" fill="#ff5430" stroke="#ffd466" stroke-width="0.9"/>`;
      } else if (isWall) {
        rects += `<rect x="${x}" y="${y}" width="7" height="7" rx="1.2" fill="currentColor" fill-opacity="0.88"/>`;
      } else {
        rects += `<rect x="${x}" y="${y}" width="7" height="7" rx="1.2" fill="rgba(255,255,255,0.11)"/>`;
      }
    }
  }
  return `<svg class="route-blueprint-svg" viewBox="0 0 67 67" aria-hidden="true">${rects}</svg>`;
}

