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
    summary: '1 Mossa · Smart Chord',
    description:
      'Rivela celle sicure (1 Mossa). Clicca un numero già soddisfatto da cariche/Note per aprire i vicini in un colpo.',
  },
  pin: {
    id: 'pin',
    name: 'Nota',
    shortName: 'Nota',
    hotkey: 'F',
    accent: 'brass',
    isWire: false,
    summary: 'Gratis · Segnalino',
    description:
      'Segna mine sospette gratis senza spendere cariche. Vale anche per lo Smart Chord sui numeri.',
  },
  c4: {
    id: 'c4',
    name: 'C4 Base',
    shortName: 'C4',
    hotkey: '1',
    accent: 'amber',
    isWire: true,
    basePoints: 60,
    summary: '60 pt + 20/num.',
    description:
      'Carica ad alto rendimento su deduzioni solide: 60 pt base + 20 pt per ogni numero rivelato adiacente.',
  },
  arc: {
    id: 'arc',
    name: 'Ponte Arco',
    shortName: 'Arco',
    hotkey: '2',
    accent: 'cyan',
    isWire: true,
    basePoints: 70,
    summary: '70 pt · +0.5×/link',
    description:
      'Si collega alle altre mine cablate su riga o colonna, innescando tutto ciò che sta in mezzo (+0.5× per link).',
  },
  cross: {
    id: 'cross',
    name: 'Carica Croce',
    shortName: 'Croce',
    hotkey: '3',
    accent: 'ember',
    isWire: true,
    basePoints: 90,
    summary: '90 pt · Raggio 2',
    description:
      'Esplode per 2 celle nelle 4 direzioni cardinali: innesca mine nascoste e frantuma placche corazzate.',
  },
  amp: {
    id: 'amp',
    name: 'Amplificatore',
    shortName: 'Amp',
    hotkey: '4',
    accent: 'gold',
    isWire: true,
    basePoints: 50,
    summary: '+0.75× · Vicini ×2',
    description:
      'Aumenta la catena di +0.75× e raddoppia (×2) il valore di tutte le altre esplosioni nella sua area 3×3. Cablalo per primo!',
  },
  prism: {
    id: 'prism',
    name: 'Deviascintilla',
    shortName: 'Prisma',
    hotkey: '5',
    accent: 'ice',
    isWire: true,
    basePoints: 65,
    summary: 'Piega Archi a 90°',
    description:
      'Devia un Ponte Arco in arrivo di 90° verso qualsiasi altra mina cablata sulla linea perpendicolare (+0.4× per deviazione).',
  },
  siphon: {
    id: 'siphon',
    name: 'Estrattore',
    shortName: 'Sifone',
    hotkey: '6',
    accent: 'emerald',
    isWire: true,
    basePoints: 40,
    summary: '+35 ₡ · +2 Mosse',
    description:
      'Drena l’energia della mina invece di puntare al punteggio massimo: +40 pt base, +35 ₡ immediati e +2 Mosse.',
  },
  sonar: {
    id: 'sonar',
    name: 'Sonar 3×3',
    shortName: 'Sonar',
    hotkey: '7',
    accent: 'emerald',
    isWire: false,
    summary: 'Rivela 1 mina 3×3',
    description:
      'Scansiona un’area 3×3 ed evidenzia una mina sicura nascosta. Risolve istantaneamente i bivi 50/50.',
  },
};
