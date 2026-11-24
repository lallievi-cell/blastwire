import { countLiveMines } from '../engine/MinesweeperLogic';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { GameSnapshot, SalvoBreakdown } from '../types/game';
import { UI_ICONS } from './icons';

export class HudView {
  private sectorBadge = document.getElementById('hud-sector-badge')!;
  private biomeSub = document.getElementById('hud-biome-sub')!;
  private scoreEl = document.getElementById('hud-score')!;
  private targetEl = document.getElementById('hud-target')!;
  private progressBar = document.getElementById('hud-progress-bar')!;
  private estBar = document.getElementById('hud-est-bar')!;
  private shieldBox = document.getElementById('hud-shield-box')!;
  private shieldsEl = document.getElementById('hud-shields')!;
  private movesBox = document.getElementById('hud-moves-box')!;
  private movesEl = document.getElementById('hud-moves')!;
  private creditsEl = document.getElementById('hud-credits')!;
  private speedBtn = document.getElementById('btn-speed')!;
  private muteBtn = document.getElementById('btn-mute')!;

  private minesLeftEl = document.getElementById('hud-mines-left')!;
  private wiredCountEl = document.getElementById('hud-wired-count')!;
  private anomalyPill = document.getElementById('hud-anomaly-pill')!;
  private chainPill = document.getElementById('hud-chain-pill')!;
  private chainText = document.getElementById('hud-chain-text')!;
  private comboCallout = document.getElementById('combo-callout')!;
  private toastEl = document.getElementById('toast-msg')!;
  private seedBtn = document.getElementById('btn-copy-seed')!;
  private seedText = document.getElementById('hud-seed-text')!;

  private tutBanner = document.getElementById('tutorial-banner')!;
  private tutBadge = document.getElementById('tut-step-badge')!;
  private tutTitle = document.getElementById('tut-title')!;
  private tutDesc = document.getElementById('tut-desc')!;
  private tutFinishBtn = document.getElementById('btn-tut-finish')!;
  private tutSkipBtn = document.getElementById('btn-tut-skip')!;

  private displayedScore = 0;
  private targetScoreAnim = 0;
  private scoreRaf = 0;
  private calloutTimer = 0;

  setScoreImmediate(score: number): void {
    this.displayedScore = score;
    this.targetScoreAnim = score;
    this.scoreEl.textContent = String(score);
  }

  animateScoreTo(score: number): void {
    this.targetScoreAnim = score;
    if (this.scoreRaf) return;
    const step = () => {
      const diff = this.targetScoreAnim - this.displayedScore;
      if (Math.abs(diff) <= 2) {
        this.displayedScore = this.targetScoreAnim;
        this.scoreEl.textContent = String(this.displayedScore);
        this.scoreRaf = 0;
        return;
      }
      this.displayedScore += diff > 0 ? Math.ceil(diff * 0.28) : Math.floor(diff * 0.28);
      this.scoreEl.textContent = String(this.displayedScore);
      this.scoreRaf = requestAnimationFrame(step);
    };
    this.scoreRaf = requestAnimationFrame(step);
  }

  render(
    snap: GameSnapshot,
    est: SalvoBreakdown,
    muted: boolean,
    animSpeed: 1 | 2,
    liveScoreOverride?: number,
  ): void {
    // Apply sector biome theme to document
    document.documentElement.dataset.biome = snap.config.biome;

    // Brand / Sector header
    this.sectorBadge.textContent = snap.tutorialMode
      ? 'TUTORIAL'
      : snap.config.isBoss
        ? `BOSS S${snap.sector}`
        : `SETTORE ${snap.sector}`;
    this.sectorBadge.classList.toggle('boss', snap.config.isBoss);
    this.biomeSub.textContent = snap.tutorialMode
      ? 'Simulazione 5×5 · Addestramento'
      : `${snap.config.title} · ${snap.config.biomeLabel}`;

    // Quota & Score
    const effectiveScore = liveScoreOverride ?? snap.sectorScore;
    if (effectiveScore === 0) {
      this.setScoreImmediate(0);
    } else {
      this.animateScoreTo(effectiveScore);
    }
    this.targetEl.textContent = String(snap.sectorTarget);
    const rawPct = Math.min(100, Math.round((effectiveScore / snap.sectorTarget) * 100));
    const displayPct = snap.omegaCoreAlive ? Math.min(95, rawPct) : rawPct;
    this.progressBar.style.width = `${displayPct}%`;

    if (est.totalPoints > 0 && !snap.isDetonating) {
      const estPct = Math.min(
        100 - displayPct,
        Math.round((est.totalPoints / snap.sectorTarget) * 100),
      );
      this.estBar.style.left = `${displayPct}%`;
      this.estBar.style.width = `${estPct}%`;
      this.estBar.classList.toggle('clears', est.willClearQuota && !snap.omegaCoreAlive);
    } else {
      this.estBar.style.width = '0%';
    }

    // Core stats
    this.shieldsEl.textContent = `${snap.shields}/${snap.maxShields}`;
    this.shieldBox.classList.toggle('critical', snap.shields <= 1);
    this.movesEl.textContent = String(snap.moves);
    this.movesBox.classList.toggle('low', snap.moves <= 3);
    this.creditsEl.textContent = String(snap.credits);

    // Speed & Mute buttons
    this.speedBtn.textContent = `${animSpeed}×`;
    this.speedBtn.classList.toggle('active', animSpeed === 2);
    this.muteBtn.innerHTML = muted ? UI_ICONS.volumeOff : UI_ICONS.volumeOn;
    this.muteBtn.classList.toggle('active', !muted);

    // Sector telemetry bar
    const liveMines = snap.firstClickDone ? countLiveMines(snap.board) : snap.config.mines;
    const wiredCount = snap.board.flat().filter((c) => c.wire !== null).length;
    this.minesLeftEl.textContent = String(liveMines);
    this.wiredCountEl.textContent = String(wiredCount);

    // Anomaly / Active Boss countdown pill (ALWAYS visible!)
    this.anomalyPill.classList.remove('boss-alert', 'anomaly-info', 'hidden');
    if (snap.tutorialMode) {
      this.anomalyPill.classList.add('hidden');
    } else if (snap.config.anomaly === 'bastion' && snap.config.bastionInterval) {
      const left = snap.config.bastionInterval - snap.movesSinceBastion;
      this.anomalyPill.classList.add('boss-alert');
      this.anomalyPill.textContent = `BASTIONE · Corazza tra ${left} moss${left === 1 ? 'a' : 'e'}`;
    } else if (snap.config.anomaly === 'omega') {
      this.anomalyPill.classList.add('boss-alert');
      this.anomalyPill.textContent = snap.omegaCoreAlive
        ? 'NUCLEO OMEGA ATTIVO · Detonalo!'
        : 'NUCLEO OMEGA DISTRUTTO · Quota sbloccata!';
    } else {
      this.anomalyPill.classList.add('anomaly-info');
      this.anomalyPill.textContent = snap.config.anomalyText;
    }

    // Seed chip
    this.seedText.textContent = snap.seed;
    this.seedBtn.classList.toggle('hidden', snap.tutorialMode);

    // Tutorial banner
    if (snap.tutorialMode) {
      const spec = TUTORIAL_STEPS[snap.tutorialStep];
      this.tutBanner.classList.remove('hidden');
      if (spec) {
        this.tutBadge.textContent = spec.badge;
        this.tutTitle.textContent = spec.title;
        this.tutDesc.textContent = spec.desc;
        this.tutFinishBtn.classList.toggle('hidden', !spec.finished);
        this.tutSkipBtn.classList.toggle('hidden', Boolean(spec.finished));
      }
    } else {
      this.tutBanner.classList.add('hidden');
    }
  }

  setLiveChain(visible: boolean, chainCount = 0, mult = 1): void {
    this.chainPill.classList.toggle('hidden', !visible);
    if (visible) {
      this.chainText.textContent = `CATENA ${chainCount} · ×${mult.toFixed(2)}`;
    }
  }

  showComboCallout(text: string): void {
    this.comboCallout.textContent = text;
    this.comboCallout.classList.add('show');
    window.clearTimeout(this.calloutTimer);
    this.calloutTimer = window.setTimeout(() => {
      this.comboCallout.classList.remove('show');
    }, 1350);
  }

  showToast(
    msg: string,
    tone: 'neutral' | 'info' | 'warn' | 'danger' | 'success' = 'neutral',
  ): void {
    this.toastEl.textContent = msg;
    this.toastEl.className = `toast-text ${tone}`;
  }
}
