import type { Cell } from '../types/game';
import type { SeededRng } from './prng';

export function getNeighbors(board: Cell[][], r: number, c: number): Cell[] {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const list: Cell[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        list.push(board[nr][nc]);
      }
    }
  }
  return list;
}

export function recalculateCounts(
  board: Cell[][],
  trackPrevious = false,
): { r: number; c: number; from: number; to: number }[] {
  const drops: { r: number; c: number; from: number; to: number }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      const prev = cell.adjMines;
      let count = 0;
      for (const n of getNeighbors(board, r, c)) {
        if (n.isMine) count++;
      }
      if (trackPrevious && cell.revealed && !cell.scrambled && prev !== count) {
        cell.prevAdjMines = prev;
        if (count < prev) {
          drops.push({ r, c, from: prev, to: count });
        }
      } else if (!trackPrevious) {
        cell.prevAdjMines = null;
      }
      cell.adjMines = count;
    }
  }
  return drops;
}

export function countLiveMines(board: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].isMine) count++;
    }
  }
  return count;
}

export function getWiredCells(board: Cell[][]): Cell[] {
  const list: Cell[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].wire !== null) list.push(board[r][c]);
    }
  }
  list.sort((a, b) => a.wireOrder - b.wireOrder);
  return list;
}

export type MarkStatus = 'under' | 'exact' | 'over';

export function getNumberMarkStatus(board: Cell[][], cell: Cell): MarkStatus {
  if (!cell.revealed || cell.scrambled || cell.adjMines <= 0) return 'under';
  const marked = getNeighbors(board, cell.r, cell.c).filter(
    (n) => n.wire !== null || n.pinned,
  ).length;
  if (marked === cell.adjMines) return 'exact';
  if (marked > cell.adjMines) return 'over';
  return 'under';
}

export interface FloodRevealResult {
  revealedCount: number;
  crystalsCollected: { r: number; c: number; credits: number }[];
}

export function floodReveal(
  board: Cell[][],
  startR: number,
  startC: number,
): FloodRevealResult {
  const start = board[startR]?.[startC];
  if (!start) return { revealedCount: 0, crystalsCollected: [] };

  const queue: Cell[] = [start];
  let revealedCount = 0;
  const crystalsCollected: { r: number; c: number; credits: number }[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.revealed || cur.isMine || cur.armored || cur.wire || cur.pinned) continue;
    cur.revealed = true;
    revealedCount++;

    if (cur.crystal) {
      cur.crystal = false;
      crystalsCollected.push({ r: cur.r, c: cur.c, credits: 40 });
    }

    if (cur.adjMines === 0 && !cur.scrambled) {
      for (const n of getNeighbors(board, cur.r, cur.c)) {
        if (!n.revealed && !n.isMine && !n.armored && !n.wire && !n.pinned) {
          queue.push(n);
        }
      }
    }
  }

  return { revealedCount, crystalsCollected };
}

export function autoCleanZeroNeighbors(
  board: Cell[][],
): { r: number; c: number; credits: number }[] {
  const crystalsCollected: { r: number; c: number; credits: number }[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const cell = board[r][c];
        if (cell.revealed && !cell.scrambled && cell.adjMines === 0) {
          for (const n of getNeighbors(board, r, c)) {
            if (!n.revealed && !n.isMine && !n.armored && !n.wire) {
              n.revealed = true;
              n.pinned = false;
              if (n.crystal) {
                n.crystal = false;
                crystalsCollected.push({ r: n.r, c: n.c, credits: 40 });
              }
              changed = true;
            }
          }
        }
      }
    }
  }
  return crystalsCollected;
}

export interface SonarResult {
  found: Cell | null;
  totalMinesInArea: number;
}

export function scanSonarArea(
  board: Cell[][],
  r: number,
  c: number,
  rng: SeededRng,
): SonarResult {
  const center = board[r]?.[c];
  if (!center) return { found: null, totalMinesInArea: 0 };

  const area = [center, ...getNeighbors(board, r, c)];
  const hiddenMines = area.filter(
    (cell) => cell.isMine && !cell.wire && !cell.sonarPing && !cell.omegaCore,
  );
  if (hiddenMines.length === 0) {
    return { found: null, totalMinesInArea: 0 };
  }

  const target = hiddenMines[rng.int(hiddenMines.length)];
  target.sonarPing = true;
  target.pinned = false;
  return { found: target, totalMinesInArea: hiddenMines.length };
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}
