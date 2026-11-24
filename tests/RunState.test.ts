import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/engine/RunState';

describe('RunState GameEngine', () => {
  it('generates identical boards for the same seed', () => {
    const a = new GameEngine('BW-TEST-01', 'demolisher');
    const b = new GameEngine('BW-TEST-01', 'demolisher');
    a.handleCellAction(3, 3, false);
    b.handleCellAction(3, 3, false);

    const minesA = a
      .getSnapshot()
      .board.flat()
      .map((c) => c.isMine);
    const minesB = b
      .getSnapshot()
      .board.flat()
      .map((c) => c.isMine);

    expect(minesA).toEqual(minesB);
  });

  it('supports undoLastWire and reverseWireOrder cleanly', () => {
    const engine = new GameEngine('BW-ORD-99', 'demolisher');
    engine.handleCellAction(3, 3, false); // init board
    const snap = engine.getSnapshot();

    const mines = snap.board.flat().filter((c) => c.isMine);
    engine.setTool('amp');
    engine.handleCellAction(mines[0].r, mines[0].c, false);
    engine.setTool('c4');
    engine.handleCellAction(mines[1].r, mines[1].c, false);

    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['amp', 'c4']);

    engine.reverseWireOrder();
    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['c4', 'amp']);

    engine.undoLastWire();
    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['c4']);
    expect(engine.getSnapshot().charges.amp).toBe(2);
  });

  it('triggers Bastion Boss armor every 4 dig moves in Sector 3', () => {
    const engine = new GameEngine('BW-BOSS-03', 'demolisher');
    engine.startSector(3);
    engine.handleCellAction(0, 0, false); // dig 1

    const initialArmor = engine
      .getSnapshot()
      .board.flat()
      .filter((c) => c.armored).length;

    // Find 3 safe unrevealed cells to dig
    const safeCells = engine
      .getSnapshot()
      .board.flat()
      .filter((c) => !c.revealed && !c.isMine && !c.armored);

    let armoredEventTriggered = false;
    for (let i = 0; i < 3 && i < safeCells.length; i++) {
      const fb = engine.handleCellAction(safeCells[i].r, safeCells[i].c, false);
      if (fb.bastionArmored && fb.bastionArmored.length > 0) {
        armoredEventTriggered = true;
      }
    }

    const afterArmor = engine
      .getSnapshot()
      .board.flat()
      .filter((c) => c.armored).length;

    expect(armoredEventTriggered).toBe(true);
    expect(afterArmor).toBeGreaterThan(initialArmor);
  });

  it('prevents suicide total-clear exploit when stepping on last mine', () => {
    const engine = new GameEngine('BW-FAIR-01', 'demolisher');
    engine.handleCellAction(3, 3, false);
    const board = engine.getSnapshot().board;

    // Remove all mines except 1
    const mines = board.flat().filter((c) => c.isMine);
    for (let i = 1; i < mines.length; i++) {
      mines[i].isMine = false;
    }

    // Step directly on the last mine
    engine.setTool('dig');
    engine.handleCellAction(mines[0].r, mines[0].c, false);

    // Must NOT award a free sector clear — instead triggers Game Over (0 mines left before quota)
    expect(engine.getSnapshot().sectorScore).toBe(0);
    expect(engine.getSnapshot().isGameOver).toBe(true);
  });

  it('scales shop upgrade prices on repeated purchases', () => {
    const engine = new GameEngine('BW-SHOP-01', 'demolisher');
    engine.getSnapshot().credits = 500;
    engine.openShop();

    const firstPrice = engine.getUpgradePrice('add_amp');
    expect(engine.buyUpgrade('add_amp')).toBe(true);
    const secondPrice = engine.getUpgradePrice('add_amp');
    expect(secondPrice).toBeGreaterThan(firstPrice);
  });

  it('Sector 6 Omega Core blocks completion until destroyed, then clears quota with +600 base', () => {
    const engine = new GameEngine('BW-OMEGA-6', 'demolisher');
    engine.startSector(6);
    engine.handleCellAction(0, 0, false);
    const snap = engine.getSnapshot();
    const core = snap.board.flat().find((c) => c.omegaCore);
    expect(core).toBeDefined();
    expect(snap.omegaCoreAlive).toBe(true);

    // Even if score >= target, Omega Core alive keeps sector active
    snap.sectorScore = snap.sectorTarget + 100;
    const normalMine = snap.board.flat().find((c) => c.isMine && !c.omegaCore)!;
    engine.setTool('c4');
    engine.handleCellAction(normalMine.r, normalMine.c, false);
    const res1 = engine.beginDetonation()!;
    const out1 = engine.commitDetonation(res1);
    expect(out1.sectorCleared).toBe(false);
    expect(engine.getSnapshot().omegaCoreAlive).toBe(true);

    // Now wire and detonate the Omega Core!
    engine.setTool('c4');
    engine.handleCellAction(core!.r, core!.c, false);
    const res2 = engine.beginDetonation()!;
    const out2 = engine.commitDetonation(res2);
    expect(engine.getSnapshot().omegaCoreAlive).toBe(false);
    expect(out2.sectorCleared).toBe(true);
    expect(out2.campaignVictory).toBe(true);
  });

  it('Surgeon chassis performs Smart Chord for 0 moves', () => {
    const engine = new GameEngine('BW-SURG-1', 'surgeon');
    engine.handleCellAction(3, 3, false);
    const snap = engine.getSnapshot();
    // Find a revealed numbered cell whose adjacent mines we can mark
    const numbered = snap.board
      .flat()
      .find((c) => c.revealed && c.adjMines > 0 && !c.scrambled);
    expect(numbered).toBeDefined();

    // Mark exact real mines around it with Pin
    const neighbors = snap.board
      .flat()
      .filter(
        (n) =>
          Math.abs(n.r - numbered!.r) <= 1 &&
          Math.abs(n.c - numbered!.c) <= 1 &&
          !(n.r === numbered!.r && n.c === numbered!.c),
      );
    engine.setTool('pin');
    for (const n of neighbors) {
      if (n.isMine) engine.handleCellAction(n.r, n.c, false);
    }

    const movesBefore = engine.getSnapshot().moves;
    engine.setTool('dig');
    engine.handleCellAction(numbered!.r, numbered!.c, false);
    expect(engine.getSnapshot().moves).toBe(movesBefore);
  });

  it('Siphon module harvests +35 credits and +2 moves on detonation', () => {
    const engine = new GameEngine('BW-SIPH-1', 'demolisher');
    engine.handleCellAction(3, 3, false);
    const mine = engine.getSnapshot().board.flat().find((c) => c.isMine)!;
    const creditsBefore = engine.getSnapshot().credits;
    const movesBefore = engine.getSnapshot().moves;

    engine.setTool('siphon');
    engine.handleCellAction(mine.r, mine.c, false);
    engine.executeDetonationSync();

    expect(engine.getSnapshot().credits).toBeGreaterThanOrEqual(creditsBefore + 35);
    expect(engine.getSnapshot().moves).toBe(movesBefore + 2);
  });
});
