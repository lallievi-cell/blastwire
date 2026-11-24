import { describe, expect, it } from 'vitest';
import { getSectorConfig } from '../src/data/sectors';
import {
  createEmptyBoard,
  populateMinesAndAnomalies,
} from '../src/engine/BoardGenerator';
import {
  floodReveal,
  getNumberMarkStatus,
  recalculateCounts,
  scanSonarArea,
} from '../src/engine/MinesweeperLogic';
import { SeededRng } from '../src/engine/prng';

describe('MinesweeperLogic & Fair Board Generation', () => {
  it('computes accurate neighbor counts and tracks drops after detonation', () => {
    const board = createEmptyBoard(5, 5);
    board[1][1].isMine = true;
    board[1][2].isMine = true;
    recalculateCounts(board, false);

    expect(board[2][1].adjMines).toBe(2);
    expect(board[0][0].adjMines).toBe(1);

    board[2][1].revealed = true;
    board[1][1].isMine = false;
    const drops = recalculateCounts(board, true);

    expect(board[2][1].adjMines).toBe(1);
    expect(drops).toEqual([{ r: 2, c: 1, from: 2, to: 1 }]);
  });

  it('detects under, exact, and over-flagged numbers accurately', () => {
    const board = createEmptyBoard(3, 3);
    board[0][0].isMine = true;
    recalculateCounts(board, false);
    const center = board[1][1];
    center.revealed = true;

    expect(getNumberMarkStatus(board, center)).toBe('under');
    board[0][0].pinned = true;
    expect(getNumberMarkStatus(board, center)).toBe('exact');
    board[0][1].wire = 'c4';
    expect(getNumberMarkStatus(board, center)).toBe('over');
  });

  it('places crystals across BOTH mines and safe cells (zero mine-location leak)', () => {
    let crystalsOnMines = 0;
    let crystalsOnSafe = 0;
    const cfg = getSectorConfig(2); // Vena Quarzo

    for (let i = 0; i < 40; i++) {
      const board = createEmptyBoard(cfg.rows, cfg.cols);
      populateMinesAndAnomalies(board, cfg, 0, 0, new SeededRng(`crystal-check-${i}`));
      for (const row of board) {
        for (const cell of row) {
          if (cell.crystal) {
            if (cell.isMine) crystalsOnMines++;
            else crystalsOnSafe++;
          }
        }
      }
    }

    expect(crystalsOnMines).toBeGreaterThan(5);
    expect(crystalsOnSafe).toBeGreaterThan(5);
  });

  it('floodReveal opens zero cascades and collects crystals on safe tiles', () => {
    const board = createEmptyBoard(5, 5);
    board[4][4].isMine = true;
    board[0][1].crystal = true;
    recalculateCounts(board, false);

    const res = floodReveal(board, 0, 0);
    expect(res.revealedCount).toBe(24);
    expect(res.crystalsCollected).toHaveLength(1);
    expect(res.crystalsCollected[0].credits).toBe(40);
    expect(board[4][4].revealed).toBe(false);
  });

  it('sonar finds a hidden mine inside a 3x3 area deterministically', () => {
    const board = createEmptyBoard(5, 5);
    board[2][3].isMine = true;
    const res = scanSonarArea(board, 2, 2, new SeededRng('sonar-seed'));
    expect(res.found).not.toBeNull();
    expect(res.found?.r).toBe(2);
    expect(res.found?.c).toBe(3);
    expect(board[2][3].sonarPing).toBe(true);
  });
});
