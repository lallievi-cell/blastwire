import { MODULES } from './modules';
import { getNumberMarkStatus } from '../engine/MinesweeperLogic';
import type { GameSnapshot } from '../types/game';
import { MODULE_ICONS, TILE_ICONS } from '../ui/icons';

export type TileGuideId =
  | 'hidden'
  | 'number'
  | 'chord_ready'
  | 'hotspot'
  | 'barrel'
  | 'crystal'
  | 'wall'
  | 'armored'
  | 'bastion'
  | 'emp'
  | 'omega'
  | 'crater';

export interface TileGuideEntry {
  id: TileGuideId;
  name: string;
  shortChip: string;
  badge: string;
  accent: 'steel' | 'amber' | 'gold' | 'cyan' | 'ember' | 'emerald' | 'ice';
  category: 'base' | 'special';
  desc: string;
  previewClasses: string;
  previewInnerHtml: string;
}

export interface TileInspectResult {
  guideId: TileGuideId;
  name: string;
  badge: string;
  accent: string;
  iconHtml: string;
  desc: string;
}

export const TILE_GUIDE_ENTRIES: TileGuideEntry[] = [
  {
    id: 'hidden',
    name: 'Lastra Coperta',
    shortChip: 'Lastra',
    badge: 'SCAVA O ARMA',
    accent: 'steel',
    category: 'base',
    desc: 'Può nascondere terreno sicuro oppure una mina. Usa i numeri vicini: se è sicura scavala, se c’è una mina piazzaci una bomba!',
    previewClasses: 'grid-cell cell-hidden legend-tile',
    previewInnerHtml: '',
  },
  {
    id: 'number',
    name: 'Numero Indizio (1–8)',
    shortChip: 'Numeri',
    badge: 'CONTA LE MINE',
    accent: 'cyan',
    category: 'base',
    desc: 'Ti dice quante mine totali ci sono nelle 8 caselle attorno (incluse quelle su cui hai già piazzato una bomba o una Bandiera).',
    previewClasses: 'grid-cell cell-revealed num-2 legend-tile',
    previewInnerHtml: '<span class="cell-num-glyph">2</span>',
  },
  {
    id: 'chord_ready',
    name: 'Numero Risolto (Verde ✓)',
    shortChip: '✓ Risolto',
    badge: 'TOCCA = APRI GRATIS',
    accent: 'emerald',
    category: 'base',
    desc: 'Diventa verde quando hai già segnato tutte le sue mine vicine! Toccalo per aprire in un colpo tutte le caselle sicure attorno.',
    previewClasses: 'grid-cell cell-revealed num-1 chord-ready legend-tile',
    previewInnerHtml:
      '<span class="cell-num-glyph">1</span><span class="chord-check">✓</span>',
  },
  {
    id: 'hotspot',
    name: 'Casella d’Oro (×2)',
    shortChip: '×2 Oro',
    badge: 'PUNTI DOPPI',
    accent: 'gold',
    category: 'special',
    desc: 'Se nasconde una mina e ci fai esplodere sopra una bomba, i suoi punti raddoppiano (×2, o ×3 con la reliquia Oro Fuso)!',
    previewClasses: 'grid-cell cell-hidden cell-hotspot legend-tile',
    previewInnerHtml: `<span class="tile-embed-icon hotspot">${TILE_ICONS.hotspot}</span><span class="tile-corner-tag gold">×2</span>`,
  },
  {
    id: 'barrel',
    name: 'Barile di Gas (3×3)',
    shortChip: 'Barile 3×3',
    badge: 'ESPLODE 3×3',
    accent: 'ember',
    category: 'special',
    desc: 'Non si scava! Fai esplodere una bomba lì accanto (o colpiscilo con Croce/Fulmine) per scatenare un’onda 3×3 gratuita.',
    previewClasses: 'grid-cell cell-barrel legend-tile',
    previewInnerHtml: `${TILE_ICONS.barrel}<span class="tile-subtag barrel">3×3</span>`,
  },
  {
    id: 'crystal',
    name: 'Vena di Cristallo (+₡)',
    shortChip: 'Cristallo +₡',
    badge: 'MONETE EXTRA',
    accent: 'cyan',
    category: 'special',
    desc: 'Scavala se è sicura (+40 ₡) oppure falla saltare in aria se sotto c’è una mina (+55 ₡) per guadagnare monete extra.',
    previewClasses: 'grid-cell cell-hidden cell-crystal legend-tile',
    previewInnerHtml: `<span class="tile-embed-icon crystal">${TILE_ICONS.crystal}</span><span class="tile-corner-tag cyan">+₡</span>`,
  },
  {
    id: 'wall',
    name: 'Pilastro d’Acciaio',
    shortChip: 'Pilastro',
    badge: 'MURO FISSO',
    accent: 'steel',
    category: 'special',
    desc: 'Non contiene mai mine e non esplode. Ferma i raggi dritti di Croce e Fulmine: usa lo Specchio per deviare i Fulmini dietro l’angolo!',
    previewClasses: 'grid-cell cell-wall legend-tile',
    previewInnerHtml: TILE_ICONS.wall,
  },
  {
    id: 'armored',
    name: 'Piastra Blindata',
    shortChip: 'Corazza',
    badge: 'ROMPI CON BOMBE',
    accent: 'amber',
    category: 'special',
    desc: 'Impedisce di scavare o piazzare bombe. Colpiscila con il raggio di una Croce, un Fulmine o un Barile per spaccarla!',
    previewClasses: 'grid-cell cell-armored legend-tile',
    previewInnerHtml: TILE_ICONS.armor,
  },
  {
    id: 'bastion',
    name: 'Mirino del Bastione',
    shortChip: 'Mirino Boss',
    badge: 'ALLERTA BOSS',
    accent: 'ember',
    category: 'special',
    desc: 'Ogni 4 scavi il Boss chiude questa casella con una Piastra Blindata! Se capisci che è sicura, scavala subito per bloccarlo.',
    previewClasses: 'grid-cell cell-hidden cell-bastion-target legend-tile',
    previewInnerHtml: `<span class="bastion-reticle-overlay">${TILE_ICONS.bastionReticle}</span>`,
  },
  {
    id: 'emp',
    name: 'Numero Criptato (?)',
    shortChip: 'EMP ?',
    badge: 'INTERFERENZA',
    accent: 'gold',
    category: 'special',
    desc: 'Il disturbo radio nasconde il numero. Fai esplodere qualsiasi bomba nelle caselle vicine per ripulire il segnale!',
    previewClasses: 'grid-cell cell-revealed legend-tile',
    previewInnerHtml: '<span class="cell-emp-mark">?</span>',
  },
  {
    id: 'omega',
    name: 'Nucleo Omega',
    shortChip: 'Nucleo Boss',
    badge: 'BOSS A 2 FASI',
    accent: 'ember',
    category: 'special',
    desc: 'È una mina-reattore speciale! Piazzaci sopra una bomba: il 1° colpo rompe lo scudo azzurro (o salta con combo da 4+), il 2° lo distrugge.',
    previewClasses: 'grid-cell cell-omega-core cell-omega-shielded legend-tile',
    previewInnerHtml: TILE_ICONS.omegaCore,
  },
  {
    id: 'crater',
    name: 'Cratere Bruciato',
    shortChip: 'Cratere',
    badge: 'MINA ESPLOSA',
    accent: 'ember',
    category: 'base',
    desc: 'Qui c’era una mina che hai già fatto saltare! I numeri vicini si sono già abbassati di 1 automaticamente.',
    previewClasses: 'grid-cell cell-crater legend-tile',
    previewInnerHtml: TILE_ICONS.crater,
  },
];

export const TILE_GUIDE_BY_ID: Record<TileGuideId, TileGuideEntry> = Object.fromEntries(
  TILE_GUIDE_ENTRIES.map((e) => [e.id, e]),
) as Record<TileGuideId, TileGuideEntry>;

/**
 * Returns the special tile types currently active/present in this sector
 * (without ever inspecting hidden `isMine`).
 */
export function getActiveSectorSpecialTiles(snap: GameSnapshot): TileGuideId[] {
  const found = new Set<TileGuideId>();

  if (snap.config.hotspots > 0) found.add('hotspot');
  if (snap.config.barrels > 0) found.add('barrel');
  if (snap.config.anomaly === 'crystals') found.add('crystal');
  if (snap.config.anomaly === 'armor') found.add('armored');
  if (snap.config.anomaly === 'bastion') {
    found.add('bastion');
    found.add('armored');
  }
  if (snap.config.anomaly === 'scramble') found.add('emp');
  if (snap.config.anomaly === 'omega') found.add('omega');

  for (const row of snap.board) {
    for (const c of row) {
      if (c.wall) found.add('wall');
      if (c.barrel) found.add('barrel');
      if (c.hotspot) found.add('hotspot');
      if (c.crystal) found.add('crystal');
      if (c.armored) found.add('armored');
      if (c.bastionTarget) found.add('bastion');
      if (c.scrambled) found.add('emp');
      if (c.omegaCore) found.add('omega');
    }
  }

  return Array.from(found);
}

/**
 * Zero-leak live cell inspector for hover/tap explanations in `#tool-explainer`.
 * NEVER reads `cell.isMine`.
 */
export function inspectBoardCell(
  snap: GameSnapshot,
  r: number,
  c: number,
): TileInspectResult | null {
  const cell = snap.board[r]?.[c];
  if (!cell) return null;

  if (cell.wall) {
    const g = TILE_GUIDE_BY_ID.wall;
    return {
      guideId: 'wall',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.wall,
      desc: g.desc,
    };
  }

  if (cell.barrel) {
    const g = TILE_GUIDE_BY_ID.barrel;
    return {
      guideId: 'barrel',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.barrel,
      desc: g.desc,
    };
  }

  if (cell.armored) {
    const g = TILE_GUIDE_BY_ID.armored;
    return {
      guideId: 'armored',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.armor,
      desc: g.desc,
    };
  }

  if (cell.revealed) {
    if (cell.scrambled) {
      const g = TILE_GUIDE_BY_ID.emp;
      return {
        guideId: 'emp',
        name: g.name,
        badge: g.badge,
        accent: g.accent,
        iconHtml: `<span class="cell-emp-mark" style="font-size:18px;">?</span>`,
        desc: g.desc,
      };
    }
    if (cell.crater) {
      const g = TILE_GUIDE_BY_ID.crater;
      return {
        guideId: 'crater',
        name: g.name,
        badge: g.badge,
        accent: g.accent,
        iconHtml: TILE_ICONS.crater,
        desc: g.desc,
      };
    }
    if (cell.adjMines > 0) {
      const markStatus = getNumberMarkStatus(snap.board, cell);
      const hasUnopened = snap.board[r]
        ? [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1],
          ].some(([dr, dc]) => {
            const nb = snap.board[r + dr]?.[c + dc];
            return (
              nb &&
              !nb.revealed &&
              !nb.wall &&
              !nb.barrel &&
              !nb.armored &&
              !nb.wire &&
              !nb.pinned
            );
          })
        : false;
      if (markStatus === 'exact' && hasUnopened) {
        const g = TILE_GUIDE_BY_ID.chord_ready;
        return {
          guideId: 'chord_ready',
          name: `Numero ${cell.adjMines} Risolto ✓`,
          badge: g.badge,
          accent: g.accent,
          iconHtml: `<span class="num-${cell.adjMines}" style="font-weight:800;font-size:18px;">${cell.adjMines}</span>`,
          desc: g.desc,
        };
      }
      if (markStatus === 'over') {
        return {
          guideId: 'number',
          name: `Attenzione: troppe bombe attorno al ${cell.adjMines}!`,
          badge: 'CONTROLLA',
          accent: 'ember',
          iconHtml: `<span class="num-${cell.adjMines}" style="font-weight:800;font-size:18px;">${cell.adjMines}</span>`,
          desc: `Hai piazzato più bombe o Bandiere di quante mine indica questo ${cell.adjMines}: controlla per evitare un cilecca!`,
        };
      }
    }
    return null;
  }

  // Covered cells with special traits or armed bombs
  if (cell.omegaCore) {
    return {
      guideId: 'omega',
      name: cell.omegaShield ? 'Nucleo Omega (Scudo Attivo)' : 'Nucleo Omega (Vulnerabile!)',
      badge: cell.omegaShield ? 'FASE 1 · SCUDO' : 'FASE 2 · COLPISCI',
      accent: cell.omegaShield ? 'cyan' : 'ember',
      iconHtml: TILE_ICONS.omegaCore,
      desc: cell.omegaShield
        ? 'Piazzaci sopra una bomba e detona per spezzare lo scudo azzurro (o distruggilo al volo con Boost ×2 / catena 4+)!'
        : 'Lo scudo è infranto! Piazzaci sopra una bomba e premi DETONA per distruggere il Boss!',
    };
  }

  if (cell.wire) {
    const mod = MODULES[cell.wire];
    const extraTags: string[] = [];
    if (cell.hotspot) extraTags.push('su Casella d’Oro ×2');
    if (cell.crystal) extraTags.push('con Cristallo +55 ₡');
    const extraSuffix = extraTags.length > 0 ? ` (${extraTags.join(' · ')})` : '';
    return {
      guideId: cell.hotspot ? 'hotspot' : 'hidden',
      name: `Bomba #${cell.wireOrder}: ${mod.name}${extraSuffix}`,
      badge: `ORDINE #${cell.wireOrder}`,
      accent: mod.accent,
      iconHtml: MODULE_ICONS[cell.wire],
      desc: 'Tocca con la stessa bomba (o tasto destro) per smontarla gratis, oppure cambia ordine dalla striscia sotto.',
    };
  }

  if (cell.sonarPing) {
    return {
      guideId: 'hidden',
      name: 'Mina Rilevata dal Radar!',
      badge: '100% MINA',
      accent: 'emerald',
      iconHtml: TILE_ICONS.sonarPing,
      desc: 'Il Radar ha confermato una mina qui sotto! Non scavarla: piazzaci sopra una bomba per fare punti.',
    };
  }

  if (cell.bastionTarget) {
    const g = TILE_GUIDE_BY_ID.bastion;
    return {
      guideId: 'bastion',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.bastionReticle,
      desc: g.desc,
    };
  }

  if (cell.hotspot && cell.crystal) {
    return {
      guideId: 'hotspot',
      name: 'Casella d’Oro ×2 + Cristallo +₡',
      badge: 'DOPPIO BONUS',
      accent: 'gold',
      iconHtml: TILE_ICONS.hotspot,
      desc: 'Casella ricchissima: se c’è una mina vale punti ×2 + 55 monete; se è sicura scavandola incassi +40 monete!',
    };
  }

  if (cell.hotspot) {
    const g = TILE_GUIDE_BY_ID.hotspot;
    return {
      guideId: 'hotspot',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.hotspot,
      desc: g.desc,
    };
  }

  if (cell.crystal) {
    const g = TILE_GUIDE_BY_ID.crystal;
    return {
      guideId: 'crystal',
      name: g.name,
      badge: g.badge,
      accent: g.accent,
      iconHtml: TILE_ICONS.crystal,
      desc: g.desc,
    };
  }

  if (cell.pinned) {
    return {
      guideId: 'hidden',
      name: 'Casella Protetta con Bandiera',
      badge: 'PROTETTA',
      accent: 'gold',
      iconHtml: MODULE_ICONS.pin,
      desc: 'Promemoria personale: impedisce scavi per sbaglio. Puoi piazzarci direttamente sopra una bomba quando vuoi!',
    };
  }

  return null;
}
