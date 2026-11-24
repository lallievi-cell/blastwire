import type { Cell, SectorConfig, ToolId } from '../types/game';
import { createEmptyBoard } from '../engine/BoardGenerator';
import { recalculateCounts } from '../engine/MinesweeperLogic';

export interface TutorialStepSpec {
  step: number;
  badge: string;
  title: string;
  desc: string;
  targetCell?: { r: number; c: number };
  requiredTool?: ToolId;
  highlightDetonate?: boolean;
  finished?: boolean;
}

export const TUTORIAL_SECTOR_CONFIG: SectorConfig = {
  sector: 0,
  title: 'Addestramento',
  biome: 'industrial',
  biomeLabel: 'Simulazione 5×5',
  rows: 5,
  cols: 5,
  mines: 3,
  target: 400,
  moves: 10,
  hotspots: 1,
  anomaly: 'tutorial',
  isBoss: false,
  anomalyText: 'Simulazione Addestramento · 5×5',
};

export const TUTORIAL_STEPS: Record<number, TutorialStepSpec> = {
  1: {
    step: 1,
    badge: 'STEP 1/4',
    title: '1. Ricognizione Sicura',
    desc: 'Clicca la cella evidenziata a sinistra per aprire un varco sicuro e leggere i numeri.',
    targetCell: { r: 2, c: 0 },
    requiredTool: 'dig',
  },
  2: {
    step: 2,
    badge: 'STEP 2/4',
    title: '2. Cabla un Amplificatore ×2 per primo',
    desc: 'La colonna 1-2-3-2-1 indica 3 mine verticali! Cabla quella in basso con Amplificatore: essendo #1, alzerà il moltiplicatore per tutte le successive.',
    targetCell: { r: 3, c: 3 },
    requiredTool: 'amp',
  },
  3: {
    step: 3,
    badge: 'STEP 3/4',
    title: '3. Chiudi il circuito con Ponte Arco',
    desc: 'Salta la mina centrale sull’Hotspot (⬡) e cabla quella in alto con Ponte Arco! Il fulmine colpirà la mina in mezzo raddoppiata ×2 ×2!',
    targetCell: { r: 1, c: 3 },
    requiredTool: 'arc',
  },
  4: {
    step: 4,
    badge: 'STEP 4/4',
    title: '4. Innesca la Reazione a Catena!',
    desc: 'Osserva la formula live e l’arco azzurro: ora premi DETONA per far saltare tutte e 3 le mine in un colpo solo!',
    highlightDetonate: true,
  },
  5: {
    step: 5,
    badge: 'COMPLETATO',
    title: 'Addestramento Superato!',
    desc: 'Hai appena eseguito Ordine Innesco + Amplificatore + Ponte Arco + Hotspot. Sei pronto per il Settore 1!',
    finished: true,
  },
};

export function createTutorialBoard(): Cell[][] {
  const board = createEmptyBoard(5, 5);
  board[1][3].isMine = true;
  board[2][3].isMine = true;
  board[3][3].isMine = true;
  board[2][3].hotspot = true;
  recalculateCounts(board, false);
  return board;
}
