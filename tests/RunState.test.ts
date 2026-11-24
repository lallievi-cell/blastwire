import { describe, expect, it } from 'vitest';
import { RELIC_BY_ID } from '../src/data/relics';
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

  it('supports undoLastWire, nudgeWireStep, and reverseWireOrder cleanly', () => {
    const engine = new GameEngine('BW-ORD-99', 'demolisher');
    engine.handleCellAction(3, 3, false);
    const snap = engine.getSnapshot();

    const mines = snap.board.flat().filter((c) => c.isMine);
    engine.setTool('c4');
    engine.handleCellAction(mines[0].r, mines[0].c, false);
    engine.setTool('amp');
    engine.handleCellAction(mines[1].r, mines[1].c, false);
    engine.setTool('arc');
    engine.handleCellAction(mines[2].r, mines[2].c, false);

    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['c4', 'amp', 'arc']);

    // Nudge index 1 ('amp') one step earlier -> becomes #1!
    engine.nudgeWireStep(1);
    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['amp', 'c4', 'arc']);

    engine.reverseWireOrder();
    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['arc', 'c4', 'amp']);

    engine.undoLastWire();
    expect(engine.getWiredCells().map((c) => c.wire)).toEqual(['arc', 'c4']);
    expect(engine.getSnapshot().charges.amp).toBe(2);
  });

  it('telegraphs Bastion targets in Sector 3 and allows counterplay by digging them', () => {
    const engine = new GameEngine('BW-BOSS-03', 'demolisher');
    engine.startSector(3);
    // Dig a non-wall cell
    const openStart = engine
      .getSnapshot()
      .board.flat()
      .find((c) => !c.wall)!;
    engine.handleCellAction(openStart.r, openStart.c, false);

    const telegraphed = engine
      .getSnapshot()
      .board.flat()
      .filter((c) => c.bastionTarget);
    expect(telegraphed.length).toBeGreaterThan(0);

    // Dig the first telegraphed target to block Bastion!
    const fb = engine.handleCellAction(telegraphed[0].r, telegraphed[0].c, false);
    expect(fb.ok).toBe(true);
    expect(engine.getSnapshot().board[telegraphed[0].r][telegraphed[0].c].bastionTarget).toBe(false);
  });

  it('prevents suicide total-clear exploit when stepping on last mine', () => {
    const engine = new GameEngine('BW-FAIR-01', 'demolisher');
    engine.handleCellAction(3, 3, false);
    const board = engine.getSnapshot().board;

    const mines = board.flat().filter((c) => c.isMine);
    for (let i = 1; i < mines.length; i++) {
      mines[i].isMine = false;
    }

    engine.setTool('dig');
    engine.handleCellAction(mines[0].r, mines[0].c, false);

    expect(engine.getSnapshot().sectorScore).toBe(0);
    expect(engine.getSnapshot().isGameOver).toBe(true);
  });

  it('unlocks Push Your Luck extraction when quota is met, then opens shop with balanced draft, Lv.2 offers & 2 routes', () => {
    const engine = new GameEngine('BW-PYL-01', 'demolisher');
    engine.handleCellAction(3, 3, false);
    const snap = engine.getSnapshot();
    snap.sectorScore = snap.sectorTarget - 10;

    const mine = snap.board.flat().find((c) => c.isMine)!;
    engine.setTool('c4');
    engine.handleCellAction(mine.r, mine.c, false);
    const res = engine.beginDetonation()!;
    const out = engine.commitDetonation(res);

    expect(out.justUnlockedExtract).toBe(true);
    expect(engine.getSnapshot().canExtract).toBe(true);
    expect(engine.getSnapshot().shopOpen).toBe(false); // Player can still push their luck!

    // Extract voluntarily
    engine.extractFromSector();
    const shopSnap = engine.getSnapshot();
    expect(shopSnap.shopOpen).toBe(true);

    // Balanced relic draft: at least 1 'mult' and 1 'utility'
    const cats = shopSnap.shopRelicChoices.map((id) => RELIC_BY_ID[id].category);
    expect(cats).toContain('mult');
    expect(cats).toContain('utility');

    // 2 route contracts offered for Sector 2
    expect(shopSnap.shopRouteChoices).toHaveLength(2);
    expect(shopSnap.shopLevelOffers).toHaveLength(2);

    // Buy a Module Lv.2 upgrade
    shopSnap.credits = 500;
    const offer = shopSnap.shopLevelOffers[0];
    expect(engine.buyModuleLevelUp(offer)).toBe(true);
    expect(engine.getSnapshot().moduleLevels[offer]).toBe(2);
  });

  it('Sector 6 Omega Core has 2-phase shield and blocks completion until destroyed', () => {
    const engine = new GameEngine('BW-OMEGA-6', 'demolisher');
    engine.startSector(6);
    const start = engine
      .getSnapshot()
      .board.flat()
      .find((c) => !c.wall && c.r === 4 && c.c === 4)!;
    engine.handleCellAction(start.r, start.c, false);

    const snap = engine.getSnapshot();
    const core = snap.board.flat().find((c) => c.omegaCore)!;
    expect(core).toBeDefined();
    expect(core.omegaShield).toBe(true);
    expect(snap.omegaCoreAlive).toBe(true);

    // Phase 1: single unboosted C4 breaks shield but leaves Core alive!
    snap.sectorScore = snap.sectorTarget + 100;
    engine.setTool('c4');
    engine.handleCellAction(core.r, core.c, false);
    const res1 = engine.beginDetonation()!;
    const out1 = engine.commitDetonation(res1);
    expect(res1.events.some((e) => e.kind === 'omega_shield_break')).toBe(true);
    expect(engine.getSnapshot().omegaCoreAlive).toBe(true);
    expect(out1.campaignVictory).toBe(false);

    // Phase 2: second C4 destroys the unshielded Omega Core!
    engine.setTool('c4');
    engine.handleCellAction(core.r, core.c, false);
    const res2 = engine.beginDetonation()!;
    const out2 = engine.commitDetonation(res2);
    expect(engine.getSnapshot().omegaCoreAlive).toBe(false);
    expect(out2.campaignVictory).toBe(true);
  });

  it('Surgeon chassis performs Smart Chord for 0 moves', () => {
    const engine = new GameEngine('BW-SURG-1', 'surgeon');
    engine.handleCellAction(3, 3, false);
    const snap = engine.getSnapshot();
    const numbered = snap.board
      .flat()
      .find((c) => c.revealed && c.adjMines > 0 && !c.scrambled)!;

    const neighbors = snap.board
      .flat()
      .filter(
        (n) =>
          Math.abs(n.r - numbered.r) <= 1 &&
          Math.abs(n.c - numbered.c) <= 1 &&
          !(n.r === numbered.r && n.c === numbered.c),
      );
    engine.setTool('pin');
    for (const n of neighbors) {
      if (n.isMine) engine.handleCellAction(n.r, n.c, false);
    }

    const movesBefore = engine.getSnapshot().moves;
    engine.setTool('dig');
    engine.handleCellAction(numbered.r, numbered.c, false);
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
