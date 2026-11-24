import { describe, expect, it } from 'vitest';
import { createEmptyBoard } from '../src/engine/BoardGenerator';
import {
  computeArcNetwork,
  estimateSalvo,
  resolveDetonation,
  type DetonationContext,
} from '../src/engine/DetonationResolver';
import { getWiredCells, recalculateCounts } from '../src/engine/MinesweeperLogic';

function makeCtx(overrides: Partial<DetonationContext> = {}): DetonationContext {
  return {
    chassisId: 'demolisher',
    relics: [],
    anomaly: 'none',
    surgicalBonusMult: 0,
    sectorScore: 0,
    sectorTarget: 300,
    shields: 3,
    maxShields: 3,
    ...overrides,
  };
}

describe('DetonationResolver & Fair Estimator', () => {
  it('estimateSalvo NEVER peeks at cell.isMine (100% logic integrity)', () => {
    const boardWithMines = createEmptyBoard(5, 5);
    boardWithMines[1][1].isMine = true;
    boardWithMines[1][3].isMine = true;
    boardWithMines[1][1].wire = 'arc';
    boardWithMines[1][1].wireOrder = 1;
    boardWithMines[1][3].wire = 'c4';
    boardWithMines[1][3].wireOrder = 2;

    const boardWithoutMines = createEmptyBoard(5, 5);
    boardWithoutMines[1][1].wire = 'arc';
    boardWithoutMines[1][1].wireOrder = 1;
    boardWithoutMines[1][3].wire = 'c4';
    boardWithoutMines[1][3].wireOrder = 2;

    const estA = estimateSalvo(boardWithMines, getWiredCells(boardWithMines), makeCtx());
    const estB = estimateSalvo(
      boardWithoutMines,
      getWiredCells(boardWithoutMines),
      makeCtx(),
    );

    expect(estA).toEqual(estB);
  });

  it('rewards intentional wire order: wiring Amp before Hotspot yields higher score', () => {
    const setup = (ampFirst: boolean) => {
      const board = createEmptyBoard(5, 5);
      board[2][2].isMine = true;
      board[2][2].wire = 'amp';
      board[2][2].wireOrder = ampFirst ? 1 : 2;

      board[2][3].isMine = true;
      board[2][3].hotspot = true;
      board[2][3].wire = 'c4';
      board[2][3].wireOrder = ampFirst ? 2 : 1;

      recalculateCounts(board, false);
      return resolveDetonation(board, getWiredCells(board), makeCtx());
    };

    const ampFirstRes = setup(true);
    const hotspotFirstRes = setup(false);

    expect(ampFirstRes.salvoPoints).toBeGreaterThan(hotspotFirstRes.salvoPoints);
  });

  it('supports 90-degree Prism deflections chaining hidden mines along an L-path', () => {
    const board = createEmptyBoard(6, 6);
    // Arc at (1,1) -> Prism at (1,4) -> C4 at (4,4)
    // Hidden mines along both legs: (1,2) and (3,4)
    board[1][1].isMine = true;
    board[1][1].wire = 'arc';
    board[1][1].wireOrder = 1;

    board[1][2].isMine = true; // hidden mine on horizontal leg

    board[1][4].isMine = true;
    board[1][4].wire = 'prism';
    board[1][4].wireOrder = 2;

    board[3][4].isMine = true; // hidden mine on vertical deflected leg

    board[4][4].isMine = true;
    board[4][4].wire = 'c4';
    board[4][4].wireOrder = 3;

    const net = computeArcNetwork(getWiredCells(board), false);
    expect(net.segments.some((s) => !s.isDeflected)).toBe(true);
    expect(net.segments.some((s) => s.isDeflected)).toBe(true);

    const res = resolveDetonation(board, getWiredCells(board), makeCtx());
    expect(res.chainCount).toBe(5);
    expect(res.events.some((e) => e.kind === 'beam' && e.beamStyle === 'prism')).toBe(true);
  });

  it('does NOT fire an Arc beam toward a dud (wired empty cell)', () => {
    const board = createEmptyBoard(5, 5);
    board[2][0].isMine = true;
    board[2][0].wire = 'arc';
    board[2][0].wireOrder = 1;

    board[2][2].isMine = true; // hidden mine in between

    board[2][4].isMine = false; // DUD!
    board[2][4].wire = 'c4';
    board[2][4].wireOrder = 2;

    const res = resolveDetonation(board, getWiredCells(board), makeCtx());
    // Only (2,0) detonates, (2,4) is a dud, and (2,2) stays un-detonated!
    expect(res.chainCount).toBe(1);
    expect(res.endBoardSnapshot[2][2].isMine).toBe(true);
    expect(res.events.some((e) => e.kind === 'dud')).toBe(true);
  });

  it('triggers Seismic Echo when revealed numbers drop to 0 post-detonation', () => {
    const board = createEmptyBoard(5, 5);
    board[2][2].isMine = true;
    board[2][2].wire = 'c4';
    board[2][2].wireOrder = 1;
    recalculateCounts(board, false);
    board[2][1].revealed = true; // adjMines === 1
    board[2][3].revealed = true; // adjMines === 1

    const res = resolveDetonation(
      board,
      getWiredCells(board),
      makeCtx({ relics: ['seismic_echo'] }),
    );
    const summary = res.events.find((e) => e.kind === 'salvo_summary');
    expect(summary?.kind).toBe('salvo_summary');
    if (summary && summary.kind === 'salvo_summary') {
      expect(summary.echoMovesGained).toBe(2);
      expect(summary.salvoCredits).toBe(20);
    }
  });

  it('blocks direct Arc beams with indestructible Walls while Prism routes 90° around them', () => {
    const board = createEmptyBoard(5, 5);
    // Wall right between (1,1) and (1,4)
    board[1][2].wall = true;

    board[1][1].isMine = true;
    board[1][1].wire = 'arc';
    board[1][1].wireOrder = 1;

    board[1][4].isMine = true;
    board[1][4].wire = 'c4';
    board[1][4].wireOrder = 2;

    // Direct path blocked by wall!
    const blockedNet = computeArcNetwork(getWiredCells(board), false, board);
    expect(blockedNet.segments).toHaveLength(0);

    // Add a Prism at (3,1) and wire (3,4) to route cleanly around the pillar!
    board[3][1].isMine = true;
    board[3][1].wire = 'prism';
    board[3][1].wireOrder = 3;

    board[3][4].isMine = true;
    board[3][4].wire = 'c4';
    board[3][4].wireOrder = 4;

    const routedNet = computeArcNetwork(getWiredCells(board), false, board);
    expect(routedNet.segments.some((s) => !s.isDeflected)).toBe(true);
    expect(routedNet.segments.some((s) => s.isDeflected)).toBe(true);
  });

  it('triggers adjacent Gas Barrels for a 3x3 chain blast hitting hidden mines', () => {
    const board = createEmptyBoard(5, 5);
    board[2][1].isMine = true;
    board[2][1].wire = 'c4';
    board[2][1].wireOrder = 1;

    board[2][2].barrel = true; // Adjacent Gas Barrel
    board[2][3].isMine = true; // Hidden mine inside Barrel's 3x3 radius!

    const res = resolveDetonation(board, getWiredCells(board), makeCtx());
    expect(res.events.some((e) => e.kind === 'barrel_blast')).toBe(true);
    expect(res.chainCount).toBe(3); // C4 + Barrel + Hidden Mine!
    expect(res.endBoardSnapshot[2][2].barrel).toBe(false);
    expect(res.endBoardSnapshot[2][3].isMine).toBe(false);
  });

  it('scales blast points with Module Lv.2 / Lv.3 upgrades', () => {
    const setup = (lv: number) => {
      const board = createEmptyBoard(5, 5);
      board[2][2].isMine = true;
      board[2][2].wire = 'c4';
      board[2][2].wireOrder = 1;
      return resolveDetonation(
        board,
        getWiredCells(board),
        makeCtx({
          moduleLevels: { c4: lv, arc: 1, cross: 1, amp: 1, prism: 1, siphon: 1 },
        }),
      );
    };

    expect(setup(2).salvoPoints).toBeGreaterThan(setup(1).salvoPoints);
    expect(setup(3).salvoPoints).toBeGreaterThan(setup(2).salvoPoints);
  });
});
