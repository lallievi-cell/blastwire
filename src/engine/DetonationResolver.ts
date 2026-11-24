import type {
  AnomalyId,
  ArcSegment,
  Cell,
  ChassisId,
  DetonationEvent,
  DetonationResolution,
  RelicId,
  SalvoBreakdown,
  SalvoStepEstimate,
  WireModuleId,
} from '../types/game';
import {
  autoCleanZeroNeighbors,
  cloneBoard,
  getNeighbors,
  recalculateCounts,
} from './MinesweeperLogic';

export interface DetonationContext {
  chassisId: ChassisId;
  relics: RelicId[];
  anomaly: AnomalyId;
  surgicalBonusMult: number;
  sectorScore: number;
  sectorTarget: number;
  shields: number;
  maxShields: number;
}

export interface ArcNetwork {
  segments: ArcSegment[];
  linksPerArc: Map<string, number>;
  deflectionsPerPrism: Map<string, number>;
}

const cellKey = (r: number, c: number) => `${r},${c}`;

/**
 * Computes direct Arc links AND 90-degree Prism (Deviascintilla) deflections
 * among a set of wired cells. Purely geometric — never inspects `isMine`.
 */
export function computeArcNetwork(
  wiredList: { r: number; c: number; wire: WireModuleId | null }[],
  allowDiag: boolean,
): ArcNetwork {
  const segments: ArcSegment[] = [];
  const seenSeg = new Set<string>();
  const linksPerArc = new Map<string, number>();
  const deflectionsPerPrism = new Map<string, number>();

  const addSeg = (
    a: { r: number; c: number },
    b: { r: number; c: number },
    isDeflected: boolean,
  ): boolean => {
    const k =
      a.r < b.r || (a.r === b.r && a.c < b.c)
        ? `${a.r},${a.c}-${b.r},${b.c}`
        : `${b.r},${b.c}-${a.r},${a.c}`;
    if (seenSeg.has(k)) return false;
    seenSeg.add(k);
    segments.push({ from: { r: a.r, c: a.c }, to: { r: b.r, c: b.c }, isDeflected });
    return true;
  };

  // BFS queue for prism deflections: { cell, incomingAxis: 'h' | 'v' }
  const prismQueue: { cell: { r: number; c: number }; incomingAxis: 'h' | 'v' }[] = [];
  const visitedPrismAxis = new Set<string>();

  // 1. Direct Arc-to-any-wired links
  for (const a of wiredList) {
    if (a.wire !== 'arc') continue;
    for (const b of wiredList) {
      if (a.r === b.r && a.c === b.c) continue;
      const dr = b.r - a.r;
      const dc = b.c - a.c;
      const horiz = dr === 0;
      const vert = dc === 0;
      const diag = allowDiag && Math.abs(dr) === Math.abs(dc);
      if (!horiz && !vert && !diag) continue;

      if (addSeg(a, b, false)) {
        const ak = cellKey(a.r, a.c);
        linksPerArc.set(ak, (linksPerArc.get(ak) ?? 0) + 1);
      }

      if (b.wire === 'prism' && (horiz || vert)) {
        const axis: 'h' | 'v' = horiz ? 'h' : 'v';
        const pk = `${b.r},${b.c}:${axis}`;
        if (!visitedPrismAxis.has(pk)) {
          visitedPrismAxis.add(pk);
          prismQueue.push({ cell: b, incomingAxis: axis });
        }
      }
    }
  }

  // 2. 90-degree Prism deflections
  while (prismQueue.length > 0) {
    const { cell: p, incomingAxis } = prismQueue.shift()!;
    const outAxis: 'h' | 'v' = incomingAxis === 'h' ? 'v' : 'h';

    for (const target of wiredList) {
      if (target.r === p.r && target.c === p.c) continue;
      const aligned =
        outAxis === 'h' ? target.r === p.r : target.c === p.c;
      if (!aligned) continue;

      if (addSeg(p, target, true)) {
        const pk = cellKey(p.r, p.c);
        deflectionsPerPrism.set(pk, (deflectionsPerPrism.get(pk) ?? 0) + 1);
      }

      if (target.wire === 'prism') {
        const tk = `${target.r},${target.c}:${outAxis}`;
        if (!visitedPrismAxis.has(tk)) {
          visitedPrismAxis.add(tk);
          prismQueue.push({ cell: target, incomingAxis: outAxis });
        }
      }
    }
  }

  return { segments, linksPerArc, deflectionsPerPrism };
}

function calcAmpLocalMult(
  r: number,
  c: number,
  amps: { r: number; c: number }[],
  ampRadius: number,
  multiplicativeStack: boolean,
): number {
  let count = 0;
  for (const amp of amps) {
    // Amplifiers boost OTHER cells in their radius (not themselves)
    if (amp.r === r && amp.c === c) continue;
    if (Math.abs(amp.r - r) <= ampRadius && Math.abs(amp.c - c) <= ampRadius) {
      count++;
    }
  }
  if (count === 0) return 1;
  return multiplicativeStack ? Math.pow(2, count) : 1 + count;
}

/**
 * Estimates salvo score & Balatro-style breakdown assuming all wired deductions
 * are correct. NEVER reads `cell.isMine` — 100% fair Minesweeper integrity!
 */
export function estimateSalvo(
  board: Cell[][],
  wiredList: Cell[],
  ctx: DetonationContext,
): SalvoBreakdown {
  const hasRelic = (id: RelicId) => ctx.relics.includes(id);

  if (wiredList.length === 0) {
    return {
      totalPoints: 0,
      totalBase: 0,
      avgLocalMult: 1,
      startMult: 1,
      endMult: 1,
      arcCount: 0,
      prismCount: 0,
      hasPotentialChain: false,
      willClearQuota: ctx.sectorScore >= ctx.sectorTarget,
      steps: [],
    };
  }

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const ampRadius = hasRelic('thermal_amp') ? 2 : 1;
  const amps = wiredList.filter((w) => w.wire === 'amp');
  const network = computeArcNetwork(wiredList, hasRelic('arc_diag'));

  let mult = 1.0 + ctx.surgicalBonusMult;
  if (hasRelic('unstable_core')) mult += wiredList.length * 0.35;
  const startMult = +mult.toFixed(2);

  let totalPoints = 0;
  let totalBase = 0;
  let localSum = 0;
  const steps: SalvoStepEstimate[] = [];

  wiredList.forEach((w, idx) => {
    const wire = w.wire!;
    let base = 60;

    if (w.omegaCore) {
      base = 600;
    } else if (wire === 'c4') {
      const adjNums = getNeighbors(board, w.r, w.c).filter(
        (n) => n.revealed && !n.crater && !n.scrambled && n.adjMines > 0,
      ).length;
      base = 60 + adjNums * 20;
    } else if (wire === 'arc') {
      base = 70;
      const links = network.linksPerArc.get(cellKey(w.r, w.c)) ?? 0;
      const perLink =
        (hasRelic('arc_diag') ? 0.85 : 0.5) +
        (ctx.chassisId === 'tesla' ? 0.2 : 0);
      mult += links * perLink;
    } else if (wire === 'cross') {
      base = 90;
    } else if (wire === 'amp') {
      base = 50;
      mult += 0.75;
    } else if (wire === 'prism') {
      base = 65;
      const defs = network.deflectionsPerPrism.get(cellKey(w.r, w.c)) ?? 0;
      const perDef = 0.4 + (ctx.chassisId === 'tesla' ? 0.2 : 0);
      mult += defs * perDef;
    } else if (wire === 'siphon') {
      base = hasRelic('regen_siphon') ? 80 : 40;
    }

    if (ctx.chassisId === 'demolisher') {
      base = Math.round(base * 1.15);
    }

    let localMult = calcAmpLocalMult(
      w.r,
      w.c,
      amps,
      ampRadius,
      hasRelic('thermal_amp'),
    );
    if (w.hotspot) localMult *= hasRelic('hotspot_master') ? 3 : 2;
    if (
      hasRelic('resonance_3') &&
      getNeighbors(board, w.r, w.c).some(
        (n) => n.revealed && !n.scrambled && n.adjMines >= 3,
      )
    ) {
      localMult *= 2;
    }
    const onBorder =
      w.r === 0 || w.r === rows - 1 || w.c === 0 || w.c === cols - 1;
    if (hasRelic('border_hunter') && onBorder) localMult *= 2;
    if (hasRelic('chain_overdrive') && idx >= 3) localMult = +(localMult * 1.5).toFixed(2);

    const stepMult = +mult.toFixed(2);
    const pts = Math.round(base * localMult * stepMult);
    totalPoints += pts;
    totalBase += base;
    localSum += localMult;

    steps.push({
      r: w.r,
      c: w.c,
      wire,
      order: idx + 1,
      base,
      localMult,
      chainMult: stepMult,
      points: pts,
    });

    mult = +(mult + 0.25).toFixed(2);
  });

  const arcCount = network.segments.filter((s) => !s.isDeflected).length;
  const prismCount = network.segments.filter((s) => s.isDeflected).length;
  const hasPotentialChain =
    wiredList.some((w) => w.wire === 'cross' || w.omegaCore) ||
    network.segments.length > 0;

  return {
    totalPoints,
    totalBase,
    avgLocalMult: +(localSum / wiredList.length).toFixed(2),
    startMult,
    endMult: +(mult - 0.25).toFixed(2),
    arcCount,
    prismCount,
    hasPotentialChain,
    willClearQuota: ctx.sectorScore + totalPoints >= ctx.sectorTarget,
    steps,
  };
}

interface QueueItem {
  r: number;
  c: number;
  type: WireModuleId | 'secondary';
  isSecondary: boolean;
}

/**
 * Pure deterministic detonation engine.
 * Mutates a cloned board snapshot and emits an ordered sequence of `DetonationEvent[]`
 * so animations, hit-stops, audio, and relic trigger-pops play cleanly in the UI.
 */
export function resolveDetonation(
  inputBoard: Cell[][],
  wiredList: Cell[],
  ctx: DetonationContext,
): DetonationResolution {
  const board = cloneBoard(inputBoard);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const hasRelic = (id: RelicId) => ctx.relics.includes(id);

  const events: DetonationEvent[] = [];
  const ampRadius = hasRelic('thermal_amp') ? 2 : 1;

  // Snapshot real wired mines BEFORE detonation starts so arcs/amps only work on real mines
  const realWiredMines = wiredList.filter((w) => board[w.r][w.c].isMine);
  const activeAmps = realWiredMines
    .filter((w) => w.wire === 'amp')
    .map((w) => ({ r: w.r, c: w.c }));

  // Compute Arc & Prism network ONLY over real mines (prevents duds from completing circuits!)
  const realNetwork = computeArcNetwork(realWiredMines, hasRelic('arc_diag'));
  const firedSegments = new Set<string>();

  let salvoMult = 1.0 + ctx.surgicalBonusMult;
  if (hasRelic('unstable_core') && realWiredMines.length > 0) {
    salvoMult += realWiredMines.length * 0.35;
    events.push({
      kind: 'relic_trigger',
      relicId: 'unstable_core',
      label: `+${(realWiredMines.length * 0.35).toFixed(2)}×`,
    });
  }

  let shields = ctx.shields;
  let chainCount = 0;
  let salvoPoints = 0;
  let salvoCredits = 0;
  let omegaCoreDestroyed = false;

  const queue: QueueItem[] = wiredList.map((w) => ({
    r: w.r,
    c: w.c,
    type: w.wire!,
    isSecondary: false,
  }));
  const processedBlasts = new Set<string>();

  const hitTileFromWave = (tr: number, tc: number) => {
    if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) return;
    const t = board[tr][tc];
    const key = cellKey(tr, tc);

    if (t.scrambled) {
      t.scrambled = false;
      events.push({ kind: 'unscramble', r: tr, c: tc });
    }

    if (t.crystal && !t.isMine) {
      t.crystal = false;
      salvoCredits += 40;
      events.push({ kind: 'crystal_collect', r: tr, c: tc, credits: 40 });
    }

    if (t.armored) {
      t.armored = false;
      t.revealed = true;
      t.crater = true;
      let pts = 0;
      let cr = 0;
      let rel: RelicId | undefined;
      if (hasRelic('armor_piercer')) {
        pts = 90;
        cr = 20;
        salvoPoints += pts;
        salvoCredits += cr;
        rel = 'armor_piercer';
      }
      events.push({
        kind: 'armor_break',
        r: tr,
        c: tc,
        points: pts,
        credits: cr,
        relicTriggered: rel,
      });
      return;
    }

    if (t.isMine && !t.wire && !processedBlasts.has(key)) {
      processedBlasts.add(key);
      t.pinned = false;
      queue.push({ r: tr, c: tc, type: 'secondary', isSecondary: true });
      return;
    }

    if (!t.revealed && !t.isMine && !t.wire) {
      t.revealed = true;
      t.crater = true;
      t.pinned = false;
    }
  };

  while (queue.length > 0) {
    const ev = queue.shift()!;
    const cell = board[ev.r][ev.c];
    const key = cellKey(ev.r, ev.c);

    if (!ev.isSecondary) {
      cell.wire = null;
      cell.wireOrder = 0;
    }

    // DUD check: wired an empty tile
    if (!ev.isSecondary && !cell.isMine) {
      cell.revealed = true;
      shields--;
      salvoMult = 1.0;
      events.push({
        kind: 'dud',
        r: ev.r,
        c: ev.c,
        shieldsLeft: shields,
      });
      if (shields <= 0) break;
      continue;
    }

    if (!cell.isMine) continue;

    // REAL MINE DETONATION
    processedBlasts.add(key);
    const wasOmegaCore = cell.omegaCore;
    cell.isMine = false;
    cell.omegaCore = false;
    cell.revealed = true;
    cell.crater = true;
    cell.sonarPing = false;
    cell.pinned = false;
    chainCount++;

    const triggeredRelics: { id: RelicId; label: string }[] = [];
    let creditsGained = 0;
    let movesGained = 0;
    let shieldsGained = 0;

    // Crystal on a mine awards +55₡ extraction bonus!
    if (cell.crystal) {
      cell.crystal = false;
      creditsGained += 55;
      events.push({ kind: 'crystal_collect', r: ev.r, c: ev.c, credits: 55 });
    }

    // Un-scramble neighbors + Seismic Wake relic
    for (const n of getNeighbors(board, ev.r, ev.c)) {
      if (n.scrambled) {
        n.scrambled = false;
        events.push({ kind: 'unscramble', r: n.r, c: n.c });
      }
      if (
        hasRelic('seismic_wake') &&
        !n.revealed &&
        !n.isMine &&
        !n.armored &&
        !n.wire
      ) {
        n.revealed = true;
        if (n.crystal) {
          n.crystal = false;
          salvoCredits += 40;
          events.push({ kind: 'crystal_collect', r: n.r, c: n.c, credits: 40 });
        }
      }
    }
    if (hasRelic('seismic_wake')) {
      triggeredRelics.push({ id: 'seismic_wake', label: 'SCOPRI 3×3' });
    }

    // Base points & multiplier additions
    let basePts = 60;
    if (wasOmegaCore) {
      basePts = 600;
      omegaCoreDestroyed = true;
      salvoMult += 0.5;
    } else if (ev.type === 'c4') {
      const adjNums = getNeighbors(board, ev.r, ev.c).filter(
        (n) => n.revealed && !n.crater && !n.scrambled && n.adjMines > 0,
      ).length;
      basePts = 60 + adjNums * 20;
    } else if (ev.type === 'arc') {
      basePts = 70;
      const links = realNetwork.linksPerArc.get(key) ?? 0;
      const perLink =
        (hasRelic('arc_diag') ? 0.85 : 0.5) +
        (ctx.chassisId === 'tesla' ? 0.2 : 0);
      if (links > 0) {
        salvoMult += links * perLink;
        if (hasRelic('arc_diag')) {
          triggeredRelics.push({ id: 'arc_diag', label: `+${(links * 0.85).toFixed(2)}×` });
        }
      }
    } else if (ev.type === 'cross') {
      basePts = 90;
    } else if (ev.type === 'amp') {
      basePts = 50;
      salvoMult += 0.75;
    } else if (ev.type === 'prism') {
      basePts = 65;
      const defs = realNetwork.deflectionsPerPrism.get(key) ?? 0;
      const perDef = 0.4 + (ctx.chassisId === 'tesla' ? 0.2 : 0);
      if (defs > 0) {
        salvoMult += defs * perDef;
      }
    } else if (ev.type === 'siphon') {
      basePts = hasRelic('regen_siphon') ? 80 : 40;
      creditsGained += 35;
      movesGained += 2;
      if (hasRelic('regen_siphon')) {
        shieldsGained += 1;
        triggeredRelics.push({ id: 'regen_siphon', label: '+1 SCUDO' });
      }
    } else if (ev.type === 'secondary') {
      basePts = hasRelic('domino') ? 125 : 95;
      salvoMult += 0.35;
      if (hasRelic('domino')) {
        triggeredRelics.push({ id: 'domino', label: 'DOMINO' });
      }
    }

    if (ctx.chassisId === 'demolisher') {
      basePts = Math.round(basePts * 1.15);
    }

    // Local multipliers
    let localMult = calcAmpLocalMult(
      ev.r,
      ev.c,
      activeAmps,
      ampRadius,
      hasRelic('thermal_amp'),
    );
    if (localMult > 1 && hasRelic('thermal_amp')) {
      triggeredRelics.push({ id: 'thermal_amp', label: `×${localMult}` });
    }

    let isHotspot = false;
    let hotspotMult: number | undefined;
    if (cell.hotspot) {
      isHotspot = true;
      cell.hotspot = false;
      hotspotMult = hasRelic('hotspot_master') ? 3 : 2;
      localMult *= hotspotMult;
      creditsGained += 25;
      if (hasRelic('hotspot_master')) {
        triggeredRelics.push({ id: 'hotspot_master', label: 'HOT ×3 +ARCO' });
      }
    }

    if (
      hasRelic('resonance_3') &&
      getNeighbors(board, ev.r, ev.c).some(
        (n) => n.revealed && !n.scrambled && n.adjMines >= 3,
      )
    ) {
      localMult *= 2;
      triggeredRelics.push({ id: 'resonance_3', label: '×2' });
    }

    const onBorder =
      ev.r === 0 || ev.r === rows - 1 || ev.c === 0 || ev.c === cols - 1;
    if (hasRelic('border_hunter') && onBorder) {
      localMult *= 2;
      movesGained += 1;
      triggeredRelics.push({ id: 'border_hunter', label: '×2 +1M' });
    }

    if (hasRelic('chain_overdrive') && chainCount >= 4) {
      localMult = +(localMult * 1.5).toFixed(2);
      triggeredRelics.push({ id: 'chain_overdrive', label: '×1.5' });
    }

    if (hasRelic('gold_mine')) {
      creditsGained += 15;
      triggeredRelics.push({ id: 'gold_mine', label: '+15 ₡' });
    }

    const currentMult = +salvoMult.toFixed(2);
    const finalPts = Math.round(basePts * localMult * currentMult);
    salvoPoints += finalPts;
    salvoCredits += creditsGained;

    const hitStop = localMult >= 2 || chainCount >= 4 || wasOmegaCore;

    events.push({
      kind: 'blast',
      r: ev.r,
      c: ev.c,
      blastType: wasOmegaCore ? 'omega_core' : ev.type,
      chainIndex: chainCount,
      basePts,
      localMult,
      salvoMult: currentMult,
      finalPts,
      isHotspot,
      hotspotMult,
      isOmegaCore: wasOmegaCore,
      creditsGained,
      movesGained,
      shieldsGained,
      hitStop,
      triggeredRelics,
    });

    // Geometric propagations
    if (ev.type === 'arc' || ev.type === 'prism') {
      for (const seg of realNetwork.segments) {
        const matchesEndpoint =
          (seg.from.r === ev.r && seg.from.c === ev.c) ||
          (seg.to.r === ev.r && seg.to.c === ev.c);
        if (!matchesEndpoint) continue;
        // Arcs fire non-deflected segments; Prisms fire deflected segments (or any touching segment)
        if (ev.type === 'arc' && seg.isDeflected) continue;

        const sKey = `${seg.from.r},${seg.from.c}-${seg.to.r},${seg.to.c}`;
        if (firedSegments.has(sKey)) continue;
        firedSegments.add(sKey);

        events.push({
          kind: 'beam',
          r1: seg.from.r,
          c1: seg.from.c,
          r2: seg.to.r,
          c2: seg.to.c,
          beamStyle: seg.isDeflected ? 'prism' : 'arc',
        });

        const stepR = Math.sign(seg.to.r - seg.from.r);
        const stepC = Math.sign(seg.to.c - seg.from.c);
        let cr = seg.from.r + stepR;
        let cc = seg.from.c + stepC;
        while (cr !== seg.to.r || cc !== seg.to.c) {
          hitTileFromWave(cr, cc);
          cr += stepR;
          cc += stepC;
        }
      }
    }

    if (ev.type === 'cross') {
      const range = hasRelic('cross_reach') ? 4 : 2;
      if (hasRelic('cross_reach')) {
        events.push({
          kind: 'relic_trigger',
          relicId: 'cross_reach',
          label: 'RAGGIO 4',
          r: ev.r,
          c: ev.c,
        });
      }
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        const endR = Math.max(0, Math.min(rows - 1, ev.r + dr * range));
        const endC = Math.max(0, Math.min(cols - 1, ev.c + dc * range));
        events.push({
          kind: 'beam',
          r1: ev.r,
          c1: ev.c,
          r2: endR,
          c2: endC,
          beamStyle: 'cross',
        });
        for (let step = 1; step <= range; step++) {
          hitTileFromWave(ev.r + dr * step, ev.c + dc * step);
        }
      }
    }

    if (wasOmegaCore) {
      // Omega Core detonates in a 3x3 blast wave
      for (const n of getNeighbors(board, ev.r, ev.c)) {
        hitTileFromWave(n.r, n.c);
      }
    }

    if (ev.type === 'secondary' && hasRelic('domino')) {
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        hitTileFromWave(ev.r + dr, ev.c + dc);
      }
    }

    salvoMult = +(salvoMult + 0.25).toFixed(2);
  }

  // Post-salvo board updates: track numbers that dropped!
  const numberDrops = recalculateCounts(board, true);
  const autoCrystals = autoCleanZeroNeighbors(board);
  for (const c of autoCrystals) {
    salvoCredits += c.credits;
    events.push({ kind: 'crystal_collect', r: c.r, c: c.c, credits: c.credits });
  }

  // Relic: Eco Sismica (numbers dropping to 0 grant +1 Move & +10₡, max 4)
  let echoMovesGained = 0;
  if (hasRelic('seismic_echo')) {
    const zeroDrops = numberDrops.filter((d) => d.from > 0 && d.to === 0);
    echoMovesGained = Math.min(4, zeroDrops.length);
    if (echoMovesGained > 0) {
      salvoCredits += echoMovesGained * 10;
      events.push({
        kind: 'relic_trigger',
        relicId: 'seismic_echo',
        label: `+${echoMovesGained}M +${echoMovesGained * 10}₡`,
      });
    }
  }

  // Relic: Kinetic Shield (chain >= 3 -> +1 shield & +25₡)
  if (hasRelic('kinetic_shield') && chainCount >= 3 && shields > 0) {
    salvoCredits += 25;
    events.push({
      kind: 'relic_trigger',
      relicId: 'kinetic_shield',
      label: '+1 SCUDO +25₡',
    });
  }

  events.push({
    kind: 'salvo_summary',
    chainCount,
    salvoPoints,
    salvoCredits,
    echoMovesGained,
    omegaCoreDestroyed,
  });

  return {
    events,
    chainCount,
    salvoPoints,
    salvoCredits,
    omegaCoreDestroyed,
    numberDrops,
    endBoardSnapshot: board,
  };
}
