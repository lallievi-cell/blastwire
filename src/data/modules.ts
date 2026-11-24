import type { ModuleDefinition, ToolId, WireModuleId } from '../types/game';

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
    summary: 'Bomba classica: +20 pt per ogni numero scoperto vicino.',
    description:
      'Carica classica da 60 pt base, più +20 pt extra per ogni numero già scoperto attorno alla mina.',
  },
  arc: {
    id: 'arc',
    name: 'Fulmine',
    shortName: 'Fulmine',
    hotkey: '2',
    accent: 'cyan',
    isWire: true,
    basePoints: 70,
    summary: 'Collega altre bombe in linea e fa saltare tutto nel mezzo!',
    description:
      'Lancia una scossa verso le altre bombe sulla stessa riga o colonna, innescando le mine nascoste in mezzo (+0.5× per collegamento).',
  },
  cross: {
    id: 'cross',
    name: 'Croce',
    shortName: 'Croce',
    hotkey: '3',
    accent: 'ember',
    isWire: true,
    basePoints: 90,
    summary: 'Esplode a croce (2 caselle): spacca corazze e mine nascoste.',
    description:
      'Scoppia per 2 caselle in su, giù, destra e sinistra: frantuma le piastre blindate e innesca le mine sul percorso.',
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
      'Raddoppia i punti di tutte le altre bombe nell’area 3×3 attorno a sé e aggiunge +0.75× alla catena. Piazzalo per primo!',
  },
  prism: {
    id: 'prism',
    name: 'Specchio',
    shortName: 'Specchio',
    hotkey: '5',
    accent: 'ice',
    isWire: true,
    basePoints: 65,
    summary: 'Piega un Fulmine a 90° verso un’altra bomba: catene ad angolo!',
    description:
      'Se riceve un Fulmine, lo devia di 90° verso qualsiasi altra bomba sulla linea perpendicolare (+0.4× per rimbalzo).',
  },
  siphon: {
    id: 'siphon',
    name: 'Sifone',
    shortName: 'Sifone',
    hotkey: '6',
    accent: 'emerald',
    isWire: true,
    basePoints: 40,
    summary: 'Drena la mina: guadagni +35 monete e +2 mosse extra!',
    description:
      'Invece di puntare solo ai punti, trasforma la mina in +35 monete per il negozio e +2 mosse extra.',
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
