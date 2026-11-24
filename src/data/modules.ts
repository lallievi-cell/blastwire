import type { ModuleDefinition, ModuleLevels, ToolId, WireModuleId } from '../types/game';

export const WIRE_MODULE_IDS: WireModuleId[] = [
  'c4',
  'arc',
  'cross',
  'amp',
  'prism',
  'siphon',
];

export const TOOL_ORDER: ToolId[] = [
  'dig',
  'pin',
  'c4',
  'arc',
  'cross',
  'amp',
  'prism',
  'siphon',
  'sonar',
];

export function createInitialModuleLevels(): ModuleLevels {
  return {
    c4: 1,
    arc: 1,
    cross: 1,
    amp: 1,
    prism: 1,
    siphon: 1,
  };
}

export interface ModuleLevelStats {
  basePts: number;
  c4PerAdj?: number;
  arcPerLink?: number;
  crossRange?: number;
  ampChainBonus?: number;
  prismPerDeflect?: number;
  siphonCredits?: number;
  siphonMoves?: number;
  nextUpgradeSummary: string;
}

export function getModuleStats(id: WireModuleId, level: number): ModuleLevelStats {
  const lv = Math.max(1, Math.min(3, level));
  switch (id) {
    case 'c4':
      return {
        basePts: lv === 1 ? 60 : lv === 2 ? 85 : 115,
        c4PerAdj: lv === 1 ? 20 : lv === 2 ? 30 : 40,
        nextUpgradeSummary:
          lv === 1 ? '85 pt base + 30/numero' : '115 pt base + 40/numero',
      };
    case 'arc':
      return {
        basePts: lv === 1 ? 70 : lv === 2 ? 95 : 125,
        arcPerLink: lv === 1 ? 0.5 : lv === 2 ? 0.75 : 1.0,
        nextUpgradeSummary:
          lv === 1 ? '95 pt base · +0.75× per link' : '125 pt base · +1.0× per link',
      };
    case 'cross':
      return {
        basePts: lv === 1 ? 90 : lv === 2 ? 120 : 155,
        crossRange: lv === 1 ? 2 : lv === 2 ? 3 : 4,
        nextUpgradeSummary:
          lv === 1 ? '120 pt base · Raggio 3 caselle' : '155 pt base · Raggio 4 caselle',
      };
    case 'amp':
      return {
        basePts: lv === 1 ? 50 : lv === 2 ? 80 : 110,
        ampChainBonus: lv === 1 ? 0.75 : lv === 2 ? 1.15 : 1.6,
        nextUpgradeSummary:
          lv === 1 ? '80 pt base · +1.15× alla catena' : '110 pt base · +1.60× alla catena',
      };
    case 'prism':
      return {
        basePts: lv === 1 ? 65 : lv === 2 ? 95 : 130,
        prismPerDeflect: lv === 1 ? 0.4 : lv === 2 ? 0.65 : 0.95,
        nextUpgradeSummary:
          lv === 1 ? '95 pt base · +0.65× per rimbalzo' : '130 pt base · +0.95× per rimbalzo',
      };
    case 'siphon':
      return {
        basePts: lv === 1 ? 40 : lv === 2 ? 65 : 95,
        siphonCredits: lv === 1 ? 35 : lv === 2 ? 50 : 70,
        siphonMoves: lv === 1 ? 2 : 3,
        nextUpgradeSummary:
          lv === 1 ? '65 pt · +50 monete · +3 mosse' : '95 pt · +70 monete · +3 mosse',
      };
  }
}

export function getModuleUpgradeCost(currentLevel: number): number {
  return currentLevel === 1 ? 75 : 120;
}

export const MODULES: Record<ToolId, ModuleDefinition> = {
  dig: {
    id: 'dig',
    name: 'Scava',
    shortName: 'Scava',
    hotkey: 'Q',
    accent: 'steel',
    isWire: false,
    summary: 'Apri una casella sicura (o tocca un numero già risolto).',
    description:
      'Scopri le caselle sicure per leggere i numeri. Tocca un numero già circondato dalle sue mine per aprire attorno in un colpo!',
  },
  pin: {
    id: 'pin',
    name: 'Bandiera',
    shortName: 'Bandiera',
    hotkey: 'F',
    accent: 'brass',
    isWire: false,
    summary: 'Segna una mina gratis senza spendere bombe.',
    description:
      'Segna dove pensi ci sia una mina senza consumare cariche. Aiuta anche ad aprire subito le caselle attorno ai numeri.',
  },
  c4: {
    id: 'c4',
    name: 'C4',
    shortName: 'C4',
    hotkey: '1',
    accent: 'amber',
    isWire: true,
    basePoints: 60,
    summary: 'Bomba classica: più numeri scoperti ha accanto, più punti fa.',
    description:
      'Carica classica: punti base più un bonus per ogni numero già scoperto attorno alla mina.',
  },
  arc: {
    id: 'arc',
    name: 'Fulmine',
    shortName: 'Fulmine',
    hotkey: '2',
    accent: 'cyan',
    isWire: true,
    basePoints: 70,
    summary: 'Collega altre bombe in linea (si ferma ai muri) e innesca ciò che sta in mezzo!',
    description:
      'Lancia una scossa verso le altre bombe sulla stessa riga o colonna, innescando mine e barili nel mezzo (i pilastri bloccano il raggio).',
  },
  cross: {
    id: 'cross',
    name: 'Croce',
    shortName: 'Croce',
    hotkey: '3',
    accent: 'ember',
    isWire: true,
    basePoints: 90,
    summary: 'Esplode a croce: spacca corazze, fa saltare barili e mine nascoste.',
    description:
      'Scoppia nelle 4 direzioni: frantuma piastre blindate, innesca barili e mine nascoste sul percorso.',
  },
  amp: {
    id: 'amp',
    name: 'Boost ×2',
    shortName: 'Boost ×2',
    hotkey: '4',
    accent: 'gold',
    isWire: true,
    basePoints: 50,
    summary: 'Raddoppia (×2) le esplosioni vicine e alza la combo! Piazzalo #1.',
    description:
      'Raddoppia i punti di tutte le altre bombe nell’area 3×3 attorno a sé e potenzia la catena. Piazzalo per primo!',
  },
  prism: {
    id: 'prism',
    name: 'Specchio',
    shortName: 'Specchio',
    hotkey: '5',
    accent: 'ice',
    isWire: true,
    basePoints: 65,
    summary: 'Piega un Fulmine a 90° attorno ai pilastri: catene ad angolo!',
    description:
      'Devia un Fulmine in arrivo di 90° verso qualsiasi altra bomba sulla linea perpendicolare — perfetto per aggirare i muri!',
  },
  siphon: {
    id: 'siphon',
    name: 'Sifone',
    shortName: 'Sifone',
    hotkey: '6',
    accent: 'emerald',
    isWire: true,
    basePoints: 40,
    summary: 'Drena la mina: guadagni monete per l’Arsenale e mosse extra!',
    description:
      'Trasforma l’energia della mina in monete immediate e mosse extra di scavo.',
  },
  sonar: {
    id: 'sonar',
    name: 'Radar',
    shortName: 'Radar',
    hotkey: '7',
    accent: 'emerald',
    isWire: false,
    summary: 'Scansiona un’area 3×3 e ti indica 1 mina sicura.',
    description:
      'Tocca un punto della griglia per scansionare un’area 3×3 e scoprire con certezza dov’è una mina nascosta.',
  },
};
