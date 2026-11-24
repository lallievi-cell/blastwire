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
  armor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/></svg>`,
  wall: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.14"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="17" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="17" r="1.2" fill="currentColor"/><circle cx="17" cy="17" r="1.2" fill="currentColor"/><path d="M7 12h10" stroke-opacity="0.5"/></svg>`,
  barrel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="6" y="4" width="12" height="16" rx="2.5" fill="currentColor" fill-opacity="0.28"/><path d="M6 9h12M6 15h12"/><path d="M12 9.5c1.5 1.4 2 2.4 2 3.3a2 2 0 11-4 0c0-.9.5-1.9 2-3.3z" fill="currentColor" stroke="none"/></svg>`,
  omegaCore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.18"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>`,
  sonarPing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/></svg>`,
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

