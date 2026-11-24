import type { AudioEngine } from '../audio/AudioEngine';
import { cloneBoard } from '../engine/MinesweeperLogic';
import type { FxEngine } from '../fx/FxEngine';
import type { DetonationResolution, GameSnapshot, SalvoBreakdown } from '../types/game';
import type { BoardView } from './BoardView';
import type { HudView } from './HudView';
import type { RelicStripView } from './RelicStripView';

const BLAST_COLORS: Record<string, string> = {
  c4: '#f59e0b',
  arc: '#56c8e0',
  cross: '#ff5636',
  amp: '#f4cd68',
  prism: '#cdeeff',
  siphon: '#4ade80',
  secondary: '#fb923c',
  omega_core: '#ff3b22',
};

const sleep = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

export async function playDetonationSequence(
  initialSnap: GameSnapshot,
  resolution: DetonationResolution,
  est: SalvoBreakdown,
  animSpeed: 1 | 2,
  audio: AudioEngine,
  fx: FxEngine,
  boardView: BoardView,
  hudView: HudView,
  relicView: RelicStripView,
): Promise<void> {
  const speedDiv = animSpeed === 2 ? 1.9 : 1;
  const visualBoard = cloneBoard(initialSnap.board);
  let liveScore = initialSnap.sectorScore;

  audio.setTensionLevel(0, true);
  hudView.setLiveChain(true, 0, 1);

  for (const ev of resolution.events) {
    if (ev.kind === 'dud') {
      const cell = visualBoard[ev.r][ev.c];
      cell.wire = null;
      cell.wireOrder = 0;
      cell.revealed = true;

      audio.playDud();
      fx.spawnExplosion(ev.r, ev.c, '#64748b', 0.78);
      fx.spawnPopup(ev.r, ev.c, 'VUOTO! -1 SCUDO', '#ff6b57', true);
      fx.flashBoard('rgba(255, 86, 54, 0.24)');
      fx.shakeBoard(9);
      boardView.render(initialSnap, visualBoard);
      await sleep(Math.round(210 / speedDiv));
      continue;
    }

    if (ev.kind === 'omega_shield_break') {
      await sleep(Math.round(45 / speedDiv));
      const cell = visualBoard[ev.r][ev.c];
      cell.wire = null;
      cell.wireOrder = 0;
      cell.omegaShield = false;

      liveScore += ev.points;
      hudView.render(initialSnap, est, audio.isMuted(), animSpeed, liveScore);
      hudView.showComboCallout('SCUDO NUCLEO ROTTO · FASE 2!');
      audio.playBlast(5, true);
      fx.spawnExplosion(ev.r, ev.c, '#48d1f0', 1.85);
      fx.spawnPopup(ev.r, ev.c, `SCUDO ROTTO! +${ev.points}`, '#48d1f0', true);
      fx.flashBoard('rgba(72, 209, 240, 0.3)');
      fx.shakeBoard(12);
      boardView.render(initialSnap, visualBoard);
      await sleep(Math.round(220 / speedDiv));
      continue;
    }

    if (ev.kind === 'barrel_blast') {
      await sleep(Math.round(35 / speedDiv));
      const cell = visualBoard[ev.r][ev.c];
      cell.barrel = false;
      cell.revealed = true;
      cell.crater = true;

      liveScore += ev.finalPts;
      hudView.setLiveChain(true, ev.chainIndex, ev.salvoMult);
      hudView.render(initialSnap, est, audio.isMuted(), animSpeed, liveScore);

      audio.playBlast(ev.chainIndex, true);
      fx.spawnExplosion(ev.r, ev.c, '#ff6a26', 1.75);
      fx.spawnPopup(ev.r, ev.c, `BARILE! +${ev.finalPts}`, '#ffaa44', true);
      fx.flashBoard('rgba(255, 110, 40, 0.24)');
      fx.shakeBoard(10);
      boardView.render(initialSnap, visualBoard);
      await sleep(Math.round(145 / speedDiv));
      continue;
    }

    if (ev.kind === 'beam') {
      audio.playBeam(ev.beamStyle);
      fx.spawnBeam(ev.r1, ev.c1, ev.r2, ev.c2, ev.beamStyle);
      continue;
    }

    if (ev.kind === 'armor_break') {
      const cell = visualBoard[ev.r][ev.c];
      cell.armored = false;
      cell.revealed = true;
      cell.crater = true;
      fx.spawnExplosion(ev.r, ev.c, '#94a3b8', 0.7);
      if (ev.relicTriggered) {
        liveScore += ev.points;
        relicView.triggerPop(ev.relicTriggered, `+${ev.points} PT`);
        fx.spawnPopup(ev.r, ev.c, `+${ev.points} PT · +${ev.credits}₡`, '#4ade80', false);
      }
      continue;
    }

    if (ev.kind === 'crystal_collect') {
      const cell = visualBoard[ev.r][ev.c];
      cell.crystal = false;
      audio.playCrystal();
      fx.spawnPopup(ev.r, ev.c, `+${ev.credits} ₡`, '#56c8e0', false);
      continue;
    }

    if (ev.kind === 'unscramble') {
      visualBoard[ev.r][ev.c].scrambled = false;
      fx.spawnPopup(ev.r, ev.c, 'DECRIPTATO', '#f4cd68', false);
      continue;
    }

    if (ev.kind === 'relic_trigger') {
      audio.playRelicPop();
      relicView.triggerPop(ev.relicId, ev.label);
      continue;
    }

    if (ev.kind === 'blast') {
      // Micro hit-stop before heavy / multiplied impacts!
      if (ev.hitStop) {
        await sleep(Math.round(42 / speedDiv));
      }

      const cell = visualBoard[ev.r][ev.c];
      cell.wire = null;
      cell.wireOrder = 0;
      cell.isMine = false;
      cell.omegaCore = false;
      cell.revealed = true;
      cell.crater = true;
      cell.hotspot = false;
      cell.pinned = false;
      cell.sonarPing = false;

      liveScore += ev.finalPts;
      hudView.setLiveChain(true, ev.chainIndex, ev.salvoMult);
      hudView.render(initialSnap, est, audio.isMuted(), animSpeed, liveScore);

      if (ev.isOmegaCore) {
        hudView.showComboCallout('NUCLEO OMEGA DISTRUTTO!');
      } else if (ev.chainIndex === 3) {
        hudView.showComboCallout('CATENA TRIPLA');
      } else if (ev.chainIndex === 5) {
        hudView.showComboCallout('SOVRACCARICO ×5');
      } else if (ev.chainIndex >= 7) {
        hudView.showComboCallout('DEMOLIZIONE TOTALE');
      }

      const blastColor = BLAST_COLORS[ev.blastType] ?? '#e4b15a';
      audio.playBlast(ev.chainIndex - 1, ev.hitStop);
      fx.spawnExplosion(
        ev.r,
        ev.c,
        blastColor,
        ev.isOmegaCore ? 2.1 : ev.localMult > 1 ? 1.5 : 1.1,
      );
      fx.spawnPopup(
        ev.r,
        ev.c,
        `+${ev.finalPts}`,
        ev.localMult > 1 || ev.isOmegaCore ? '#f4cd68' : '#f2ece1',
        ev.localMult > 1 || ev.isOmegaCore,
      );

      if (ev.isHotspot && ev.hotspotMult) {
        fx.spawnPopup(ev.r, ev.c, `HOTSPOT ×${ev.hotspotMult}! +25₡`, '#fde047', true);
      }
      if (ev.blastType === 'siphon') {
        fx.spawnPopup(ev.r, ev.c, '+35₡ · +2M', '#4ade80', false);
      }

      for (const rel of ev.triggeredRelics) {
        relicView.triggerPop(rel.id, rel.label);
      }

      fx.shakeBoard(Math.min(14, (ev.isOmegaCore ? 12 : 4) + ev.chainIndex * 1.1));
      if (ev.hitStop) {
        fx.flashBoard(
          ev.isOmegaCore ? 'rgba(255, 70, 40, 0.32)' : 'rgba(244, 205, 104, 0.2)',
        );
      }

      boardView.render(initialSnap, visualBoard);
      const stepDelay = Math.max(85, 195 - ev.chainIndex * 10);
      await sleep(Math.round(stepDelay / speedDiv));
    }
  }
}
