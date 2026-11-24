import { createInitialModuleLevels, getModuleStats } from '../data/modules';
import type {
  AnomalyId,
  ArcSegment,
  Cell,
  ChassisId,
  DetonationEvent,
  DetonationResolution,
  ModuleLevels,
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
  moduleLevels?: ModuleLevels;
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

/** Checks whether any indestructible Wall strictly blocks line-of-sight between a and b. */
function isPathBlockedByWall(
  board: Cell[][] | undefined,
  a: { r: number; c: number },
  b: { r: number; c: number },
): boolean {
  if (!board) return false;
  const stepR = Math.sign(b.r - a.r);
  const stepC = Math.sign(b.c - a.c);
  let cr = a.r + stepR;
  let cc = a.c + stepC;
  while (cr !== b.r || cc !== b.c) {
    if (board[cr]?.[cc]?.wall) return true;
    cr += stepR;
    cc += stepC;
  }
  return false;
}

/**
 * Computes direct Arc links AND 90-degree Prism (Specchio) deflections.
 * Respects Wall line-of-sight blocking; NEVER inspects `isMine`.
 */
export function computeArcNetwork(
  wiredList: { r: number; c: number; wire: WireModuleId | null }[],
  allowDiag: boolean,
  board?: Cell[][],
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

  const prismQueue: { cell: { r: number; c: number }; incomingAxis: 'h' | 'v' }[] = [];
  const visitedPrismAxis = new Set<string>();

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
      if (isPathBlockedByWall(board, a, b)) continue;

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

  while (prismQueue.length > 0) {
    const { cell: p, incomingAxis } = prismQueue.shift()!;
    const outAxis: 'h' | 'v' = incomingAxis === 'h' ? 'v' : 'h';

    for (const target of wiredList) {
      if (target.r === p.r && target.c === p.c) continue;
      const aligned = outAxis === 'h' ? target.r === p.r : target.c === p.c;
      if (!aligned) continue;
      if (isPathBlockedByWall(board, p, target)) continue;

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
  const levels = ctx.moduleLevels ?? createInitialModuleLevels();

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
  const network = computeArcNetwork(wiredList, hasRelic('arc_diag'), board);

  let mult = 1.0 + ctx.surgicalBonusMult;
  if (hasRelic('unstable_core')) mult += wiredList.length * 0.35;
  const startMult = +mult.toFixed(2);

  let totalPoints = 0;
  let totalBase = 0;
  let localSum = 0;
  const steps: SalvoStepEstimate[] = [];

  wiredList.forEach((w, idx) => {
    const wire = w.wire!;
    const stats = getModuleStats(wire, levels[wire]);
    let base = stats.basePts;

    if (w.omegaCore) {
      base = w.omegaShield ? 300 : 600;
    } else if (wire === 'c4') {
      const adjNums = getNeighbors(board, w.r, w.c).filter(
        (n) => n.revealed && !n.crater && !n.scrambled && n.adjMines > 0,
      ).length;
      base = stats.basePts + adjNums * (stats.c4PerAdj ?? 20);
    } else if (wire === 'arc') {
      const links = network.linksPerArc.get(cellKey(w.r, w.c)) ?? 0;
      const perLink =
        (stats.arcPerLink ?? 0.5) +
        (hasRelic('arc_diag') ? 0.35 : 0) +
        (ctx.chassisId === 'tesla' ? 0.2 : 0);
      mult += links * perLink;
    } else if (wire === 'amp') {
      mult += stats.ampChainBonus ?? 0.75;
    } else if (wire === 'prism') {
      const defs = network.deflectionsPerPrism.get(cellKey(w.r, w.c)) ?? 0;
      const perDef =
        (stats.prismPerDeflect ?? 0.4) + (ctx.chassisId === 'tesla' ? 0.2 : 0);
      mult += defs * perDef;
    } else if (wire === 'siphon') {
      base = hasRelic('regen_siphon') ? stats.basePts * 2 : stats.basePts;
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
    if (hasRelic('chain_overdrive') && idx >= 3) {
      localMult = +(localMult * 1.5).toFixed(2);
    }

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
  const touchesBarrel = wiredList.some((w) =>
    getNeighbors(board, w.r, w.c).some((n) => n.barrel),
  );
  const hasPotentialChain =
    touchesBarrel ||
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
  type: WireModuleId | 'secondary' | 'barrel';
  isSecondary: boolean;
}

/**
 * Pure deterministic detonation engine with Walls, Gas Barrels,
 * Module Levels (Lv.1–Lv.3), and 2-Phase Omega Core Boss.
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
  const levels = ctx.moduleLevels ?? createInitialModuleLevels();

  const events: DetonationEvent[] = [];
  const ampRadius = hasRelic('thermal_amp') ? 2 : 1;

  const realWiredMines = wiredList.filter((w) => board[w.r][w.c].isMine);
  const activeAmps = realWiredMines
    .filter((w) => w.wire === 'amp')
    .map((w) => ({ r: w.r, c: w.c }));

  const realNetwork = computeArcNetwork(realWiredMines, hasRelic('arc_diag'), board);
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

  const queueBarrelIfPresent = (tile: Cell) => {
    const key = cellKey(tile.r, tile.c);
    if (tile.barrel && !processedBlasts.has(key)) {
      processedBlasts.add(key);
      queue.push({ r: tile.r, c: tile.c, type: 'barrel', isSecondary: true });
    }
  };

  const hitTileFromWave = (tr: number, tc: number): boolean => {
    if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) return false;
    const t = board[tr][tc];
    if (t.wall) return false; // Indestructible pillar blocks waves!
    const key = cellKey(tr, tc);

    if (t.barrel) {
      queueBarrelIfPresent(t);
      return true;
    }

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
      return true;
    }

    if (t.isMine && !t.wire && !processedBlasts.has(key)) {
      processedBlasts.add(key);
      t.pinned = false;
      queue.push({ r: tr, c: tc, type: 'secondary', isSecondary: true });
      return true;
    }

    if (!t.revealed && !t.isMine && !t.wire) {
      t.revealed = true;
      t.crater = true;
      t.pinned = false;
      t.bastionTarget = false;
    }
    return true;
  };

  while (queue.length > 0) {
    const ev = queue.shift()!;
    const cell = board[ev.r][ev.c];
    const key = cellKey(ev.r, ev.c);

    // GAS BARREL CHAIN DETONATION (3x3 wave!)
    if (ev.type === 'barrel') {
      if (!cell.barrel) continue;
      cell.barrel = false;
      cell.revealed = true;
      cell.crater = true;
      chainCount++;
      salvoMult = +(salvoMult + 0.35).toFixed(2);
      const pts = Math.round(110 * salvoMult);
      salvoPoints += pts;

      events.push({
        kind: 'barrel_blast',
        r: ev.r,
        c: ev.c,
        chainIndex: chainCount,
        salvoMult,
        finalPts: pts,
      });

      for (const n of getNeighbors(board, ev.r, ev.c)) {
        hitTileFromWave(n.r, n.c);
      }
      salvoMult = +(salvoMult + 0.25).toFixed(2);
      continue;
    }

    if (!ev.isSecondary) {
      cell.wire = null;
      cell.wireOrder = 0;
    }

    // DUD check
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

    // 2-PHASE BOSS OMEGA CORE SHIELD CHECK
    if (cell.omegaCore && cell.omegaShield) {
      const localCheck = calcAmpLocalMult(
        ev.r,
        ev.c,
        activeAmps,
        ampRadius,
        hasRelic('thermal_amp'),
      );
      const canOneShot = chainCount >= 3 || localCheck >= 2;
      if (!canOneShot) {
        // Phase 1 break: shatter shield, spawn 2 bonus mines nearby, keep Core armed for Phase 2!
        cell.omegaShield = false;
        chainCount++;
        const shieldPts = Math.round(300 * salvoMult);
        salvoPoints += shieldPts;

        let spawned = 0;
        for (const n of getNeighbors(board, ev.r, ev.c)) {
          if (
            spawned < 2 &&
            !n.isMine &&
            !n.revealed &&
            !n.wall &&
            !n.barrel &&
            !n.armored &&
            !n.wire
          ) {
            n.isMine = true;
            spawned++;
          }
        }

        events.push({
          kind: 'omega_shield_break',
          r: ev.r,
          c: ev.c,
          points: shieldPts,
          spawnedMines: spawned,
        });
        salvoMult = +(salvoMult + 0.35).toFixed(2);
        continue;
      } else {
        // Heroic one-shot through shield!
        cell.omegaShield = false;
      }
    }

    // REAL MINE DETONATION
    processedBlasts.add(key);
    const wasOmegaCore = cell.omegaCore;
    cell.isMine = false;
    cell.omegaCore = false;
    cell.omegaShield = false;
    cell.revealed = true;
    cell.crater = true;
    cell.sonarPing = false;
    cell.pinned = false;
    cell.bastionTarget = false;
    chainCount++;

    const triggeredRelics: { id: RelicId; label: string }[] = [];
    let creditsGained = 0;
    let movesGained = 0;
    let shieldsGained = 0;

    if (cell.crystal) {
      cell.crystal = false;
      creditsGained += 55;
      events.push({ kind: 'crystal_collect', r: ev.r, c: ev.c, credits: 55 });
    }

    // Trigger adjacent Gas Barrels + un-scramble neighbors + Seismic Wake
    for (const n of getNeighbors(board, ev.r, ev.c)) {
      if (n.barrel) {
        queueBarrelIfPresent(n);
      }
      if (n.scrambled) {
        n.scrambled = false;
        events.push({ kind: 'unscramble', r: n.r, c: n.c });
      }
      if (
        hasRelic('seismic_wake') &&
        !n.revealed &&
        !n.wall &&
        !n.barrel &&
        !n.isMine &&
        !n.armored &&
        !n.wire
      ) {
        n.revealed = true;
        n.bastionTarget = false;
        if (n.crystal) {
          n.crystal = false;
          salvoCredits += 40;
          events.push({ kind: 'crystal_collect', r: n.r, c: n.c, credits: 40 });
        }
      }
    }
    if (hasRelic('seismic_wake')) {
      triggeredRelics.push({ id: 'seismic_wake', label: 'APRI 3×3' });
    }

    // Base points & multiplier additions using Module Level stats
    let basePts = 60;
    if (wasOmegaCore) {
      basePts = 600;
      omegaCoreDestroyed = true;
      salvoMult += 0.5;
    } else if (ev.type === 'secondary') {
      basePts = hasRelic('domino') ? 125 : 95;
      salvoMult += 0.35;
      if (hasRelic('domino')) {
        triggeredRelics.push({ id: 'domino', label: 'DOMINO' });
      }
    } else {
      const stats = getModuleStats(ev.type, levels[ev.type]);
      basePts = stats.basePts;

      if (ev.type === 'c4') {
        const adjNums = getNeighbors(board, ev.r, ev.c).filter(
          (n) => n.revealed && !n.crater && !n.scrambled && n.adjMines > 0,
        ).length;
        basePts = stats.basePts + adjNums * (stats.c4PerAdj ?? 20);
      } else if (ev.type === 'arc') {
        const links = realNetwork.linksPerArc.get(key) ?? 0;
        const perLink =
          (stats.arcPerLink ?? 0.5) +
          (hasRelic('arc_diag') ? 0.35 : 0) +
          (ctx.chassisId === 'tesla' ? 0.2 : 0);
        if (links > 0) {
          salvoMult += links * perLink;
          if (hasRelic('arc_diag')) {
            triggeredRelics.push({
              id: 'arc_diag',
              label: `+${(links * 0.35).toFixed(2)}×`,
            });
          }
        }
      } else if (ev.type === 'amp') {
        salvoMult += stats.ampChainBonus ?? 0.75;
      } else if (ev.type === 'prism') {
        const defs = realNetwork.deflectionsPerPrism.get(key) ?? 0;
        const perDef =
          (stats.prismPerDeflect ?? 0.4) + (ctx.chassisId === 'tesla' ? 0.2 : 0);
        if (defs > 0) salvoMult += defs * perDef;
      } else if (ev.type === 'siphon') {
        basePts = hasRelic('regen_siphon') ? stats.basePts * 2 : stats.basePts;
        creditsGained += stats.siphonCredits ?? 35;
        movesGained += stats.siphonMoves ?? 2;
        if (hasRelic('regen_siphon')) {
          shieldsGained += 1;
          triggeredRelics.push({ id: 'regen_siphon', label: '+1 SCUDO' });
        }
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
        triggeredRelics.push({ id: 'hotspot_master', label: 'ORO ×3 +FULMINE' });
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
      const baseRange = getModuleStats('cross', levels.cross).crossRange ?? 2;
      const range = baseRange + (hasRelic('cross_reach') ? 2 : 0);
      if (hasRelic('cross_reach')) {
        events.push({
          kind: 'relic_trigger',
          relicId: 'cross_reach',
          label: `RAGGIO ${range}`,
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
        let lastR = ev.r;
        let lastC = ev.c;
        for (let step = 1; step <= range; step++) {
          const nr = ev.r + dr * step;
          const nc = ev.c + dc * step;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
          if (board[nr][nc].wall) break; // Wall stops cross blast!
          lastR = nr;
          lastC = nc;
          hitTileFromWave(nr, nc);
        }
        if (lastR !== ev.r || lastC !== ev.c) {
          events.push({
            kind: 'beam',
            r1: ev.r,
            c1: ev.c,
            r2: lastR,
            c2: lastC,
            beamStyle: 'cross',
          });
        }
      }
    }

    if (wasOmegaCore) {
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

  const numberDrops = recalculateCounts(board, true);
  const autoCrystals = autoCleanZeroNeighbors(board);
  for (const c of autoCrystals) {
    salvoCredits += c.credits;
    events.push({ kind: 'crystal_collect', r: c.r, c: c.c, credits: c.credits });
  }

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
