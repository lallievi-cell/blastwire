import gsap from 'gsap';
import { CHASSIS_BY_ID } from '../data/chassis';
import { countLiveMines } from '../engine/MinesweeperLogic';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { GameSnapshot, SalvoBreakdown } from '../types/game';
import { UI_ICONS } from './icons';

export class HudView {
  private avatarEl = document.getElementById('hud-avatar') as HTMLImageElement;
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
  private wiredPill = document.getElementById('hud-wired-pill')!;
  private wiredCountEl = document.getElementById('hud-wired-count')!;
  private anomalyPill = document.getElementById('hud-anomaly-pill')!;
  private chainPill = document.getElementById('hud-chain-pill')!;
  private chainText = document.getElementById('hud-chain-text')!;
  private comboCallout = document.getElementById('combo-callout')!;
  private toastBar = document.getElementById('toast-bar')!;
  private toastEl = document.getElementById('toast-msg')!;

  private tutBanner = document.getElementById('tutorial-banner')!;
  private tutBadge = document.getElementById('tut-step-badge')!;
  private tutTitle = document.getElementById('tut-title')!;
  private tutDesc = document.getElementById('tut-desc')!;
  private tutFinishBtn = document.getElementById('btn-tut-finish')!;
  private tutSkipBtn = document.getElementById('btn-tut-skip')!;

  private displayedScore = 0;
  private scoreTween: gsap.core.Tween | null = null;
  private calloutTimer = 0;
  private toastTimer = 0;

  setScoreImmediate(score: number): void {
    this.scoreTween?.kill();
    this.displayedScore = score;
    this.scoreEl.textContent = String(score);
  }

  animateScoreTo(score: number): void {
    if (score === this.displayedScore) return;
    this.scoreTween?.kill();
    const proxy = { val: this.displayedScore };
    this.scoreTween = gsap.to(proxy, {
      val: score,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        this.displayedScore = Math.round(proxy.val);
        this.scoreEl.textContent = String(this.displayedScore);
      },
    });
    gsap.fromTo(
      this.scoreEl,
      { scale: 1.24 },
      { scale: 1, duration: 0.28, ease: 'back.out(2)' },
    );
  }

  render(
    snap: GameSnapshot,
    est: SalvoBreakdown,
    muted: boolean,
    animSpeed: 1 | 2,
    liveScoreOverride?: number,
  ): void {
    document.documentElement.dataset.biome = snap.config.biome;

    const spec = CHASSIS_BY_ID[snap.chassisId];
    if (spec && this.avatarEl.getAttribute('src') !== spec.portrait) {
      this.avatarEl.src = spec.portrait;
      this.avatarEl.alt = spec.name;
    }

    this.sectorBadge.textContent = snap.tutorialMode
      ? 'GUIDA'
      : snap.config.isBoss
        ? `BOSS S${snap.sector}`
        : `SETTORE ${snap.sector}`;
    this.sectorBadge.classList.toggle('boss', snap.config.isBoss);
    this.biomeSub.textContent = snap.tutorialMode
      ? 'Campo Prova · 4 passi'
      : `${snap.config.title} · ${snap.config.biomeLabel}`;

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

    this.shieldsEl.textContent = `${snap.shields}/${snap.maxShields}`;
    this.shieldBox.classList.toggle('critical', snap.shields <= 1);
    this.movesEl.textContent = String(snap.moves);
    this.movesBox.classList.toggle('low', snap.moves <= 3);
    this.creditsEl.textContent = String(snap.credits);

    this.speedBtn.textContent = `${animSpeed}×`;
    this.speedBtn.classList.toggle('active', animSpeed === 2);
    this.muteBtn.innerHTML = muted ? UI_ICONS.volumeOff : UI_ICONS.volumeOn;
    this.muteBtn.classList.toggle('active', !muted);

    const liveMines = snap.firstClickDone ? countLiveMines(snap.board) : snap.config.mines;
    const wiredCount = snap.board.flat().filter((c) => c.wire !== null).length;
    this.minesLeftEl.textContent = String(liveMines);
    this.wiredPill.classList.toggle('hidden', wiredCount === 0);
    this.wiredCountEl.textContent = String(wiredCount);

    this.anomalyPill.classList.remove('boss-alert', 'anomaly-info', 'hidden');
    if (snap.tutorialMode) {
      this.anomalyPill.classList.add('hidden');
    } else if (snap.config.anomaly === 'bastion' && snap.config.bastionInterval) {
      const left = snap.config.bastionInterval - snap.movesSinceBastion;
      this.anomalyPill.classList.add('boss-alert');
      this.anomalyPill.textContent = `BASTIONE · Blinda tra ${left} moss${left === 1 ? 'a' : 'e'}`;
    } else if (snap.config.anomaly === 'omega') {
      this.anomalyPill.classList.add('boss-alert');
      this.anomalyPill.textContent = snap.omegaCoreAlive
        ? 'NUCLEO ROSSO ATTIVO · Fallo esplodere!'
        : 'NUCLEO DISTRUTTO · Ora batti l’obiettivo!';
    } else {
      this.anomalyPill.classList.add('anomaly-info');
      this.anomalyPill.textContent = snap.config.anomalyText;
    }

    if (snap.tutorialMode) {
      const tut = TUTORIAL_STEPS[snap.tutorialStep];
      this.tutBanner.classList.remove('hidden');
      if (tut) {
        this.tutBadge.textContent = tut.badge;
        this.tutTitle.textContent = tut.title;
        this.tutDesc.textContent = tut.desc;
        this.tutFinishBtn.classList.toggle('hidden', !tut.finished);
        this.tutSkipBtn.classList.toggle('hidden', Boolean(tut.finished));
      }
    } else {
      this.tutBanner.classList.add('hidden');
    }
  }

  setLiveChain(visible: boolean, chainCount = 0, mult = 1): void {
    this.chainPill.classList.toggle('hidden', !visible);
    if (visible) {
      this.chainText.textContent = `CATENA ${chainCount} · ×${mult.toFixed(2)}`;
      gsap.fromTo(
        this.chainPill,
        { scale: 1.18 },
        { scale: 1, duration: 0.2, ease: 'back.out(2)' },
      );
    }
  }

  showComboCallout(text: string): void {
    this.comboCallout.textContent = text;
    this.comboCallout.classList.add('show');
    gsap.fromTo(
      this.comboCallout,
      { scale: 0.72 },
      { scale: 1, duration: 0.28, ease: 'back.out(2.2)' },
    );
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
    this.toastBar.classList.remove('hidden');
    gsap.fromTo(
      this.toastBar,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
    );
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastBar.classList.add('hidden');
    }, 3200);
  }

  clearToast(): void {
    window.clearTimeout(this.toastTimer);
    this.toastBar.classList.add('hidden');
  }
}
