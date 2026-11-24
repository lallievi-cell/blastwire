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
  title: 'Campo Prova',
  biome: 'industrial',
  biomeLabel: 'Guida Rapida',
  rows: 5,
  cols: 5,
  mines: 3,
  target: 400,
  moves: 10,
  hotspots: 1,
  anomaly: 'tutorial',
  isBoss: false,
  anomalyText: 'Guida rapida in 4 passi',
};

export const TUTORIAL_STEPS: Record<number, TutorialStepSpec> = {
  1: {
    step: 1,
    badge: '1 / 4',
    title: 'Apri il campo',
    desc: 'Tocca la casella illuminata a sinistra per scoprire i primi numeri.',
    targetCell: { r: 2, c: 0 },
    requiredTool: 'dig',
  },
  2: {
    step: 2,
    badge: '2 / 4',
    title: 'Piazza il Boost ×2 per primo',
    desc: 'Il 3 tocca 3 caselle chiuse: sono tutte mine! Tocca quella in basso per piazzare il Boost ×2 (#1).',
    targetCell: { r: 3, c: 3 },
    requiredTool: 'amp',
  },
  3: {
    step: 3,
    badge: '3 / 4',
    title: 'Collega con un Fulmine',
    desc: 'Salta la mina d’oro al centro e tocca quella in alto per mettere un Fulmine (#2): la scossa colpirà la mina in mezzo!',
    targetCell: { r: 1, c: 3 },
    requiredTool: 'arc',
  },
  4: {
    step: 4,
    badge: '4 / 4',
    title: 'Fai saltare tutto!',
    desc: 'Il circuito è pronto: premi il tasto rosso DETONA per innescare la reazione a catena!',
    highlightDetonate: true,
  },
  5: {
    step: 5,
    badge: 'FATTO!',
    title: 'Perfetto, hai capito tutto!',
    desc: 'Hai appena combinato Boost ×2 + Fulmine + Casella d’oro. Ora tuffati nel Settore 1!',
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
