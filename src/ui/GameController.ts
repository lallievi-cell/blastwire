import { AudioEngine } from '../audio/AudioEngine';
import { GameEngine, type ActionFeedback } from '../engine/RunState';
import {
  loadPreferences,
  loadRecord,
  savePreferences,
  saveRecord,
} from '../engine/Storage';
import { FxEngine } from '../fx/FxEngine';
import type { ChassisId, RelicId, ShopUpgradeId, ToolId, WireModuleId } from '../types/game';
import { BoardView } from './BoardView';
import { playDetonationSequence } from './DetonationPlayer';
import { DockView } from './DockView';
import { HudView } from './HudView';
import { ModalsView } from './ModalsView';
import { RelicStripView } from './RelicStripView';

export class GameController {
  private engine: GameEngine;
  private audio: AudioEngine;
  private fx: FxEngine;
  private boardView: BoardView;
  private hudView: HudView;
  private dockView: DockView;
  private relicView: RelicStripView;
  private modalsView: ModalsView;

  private hoveredCell: { r: number; c: number } | null = null;
  private animSpeed: 1 | 2;
  private selectedChassis: ChassisId;

  constructor() {
    const prefs = loadPreferences();
    this.animSpeed = prefs.animSpeed;
    this.selectedChassis = prefs.chassisId;

    this.engine = new GameEngine(undefined, this.selectedChassis);
    this.audio = new AudioEngine(prefs.muted);

    this.hudView = new HudView();
    this.relicView = new RelicStripView(
      document.getElementById('relics-container')!,
      document.getElementById('relic-count-tag')!,
      document.getElementById('relic-tooltip')!,
      document.getElementById('rt-name')!,
      document.getElementById('rt-desc')!,
    );

    this.boardView = new BoardView(
      document.getElementById('grid-container')!,
      document.getElementById('board-wrapper')!,
      {
        onCellAction: (r, c, isSec) => this.handleCellAction(r, c, isSec),
        onHoverChange: (cell) => {
          this.hoveredCell = cell;
        },
      },
    );

    this.fx = new FxEngine(
      document.getElementById('fx-canvas') as HTMLCanvasElement,
      document.getElementById('board-wrapper')!,
      document.getElementById('board-flash')!,
      document.getElementById('grid-container')!,
      () => this.engine.getSnapshot(),
      () => this.hoveredCell,
    );

    this.dockView = new DockView(
      (tool) => this.selectTool(tool),
      () => void this.triggerDetonation(),
      () => this.handleUndoWire(),
      () => this.handleReverseWires(),
      () => this.handleDisarmAll(),
    );

    this.modalsView = new ModalsView(
      {
        onSelectChassis: (id) => {
          this.selectedChassis = id;
          savePreferences({ chassisId: id });
        },
        onStartGame: (seed) => {
          void this.audio.init();
          this.engine.startNewRun(seed, this.selectedChassis);
          this.hudView.setScoreImmediate(0);
          this.renderAll(true);
          this.hudView.showToast(
            `Settore 1 pronto (Seed ${this.engine.getSnapshot().seed}). Clicca una cella per iniziare.`,
            'info',
          );
        },
        onStartTutorial: () => {
          void this.audio.init();
          this.engine.startTutorial();
          this.hudView.setScoreImmediate(0);
          this.renderAll(true);
          this.hudView.showToast('Addestramento attivo: segui i 4 step guidati.', 'info');
        },
        onDraftRelic: (id) => this.handleDraftRelic(id),
        onSkipRelic: () => this.handleSkipRelic(),
        onRerollRelics: () => this.handleRerollRelics(),
        onBuyUpgrade: (id) => this.handleBuyUpgrade(id),
        onNextSector: () => {
          this.engine.advanceToNextSector();
          this.hudView.setScoreImmediate(0);
          this.renderAll(true);
          const snap = this.engine.getSnapshot();
          this.hudView.showToast(
            `Settore ${snap.sector} (${snap.config.title}): ${snap.config.anomalyText}`,
            snap.config.isBoss ? 'warn' : 'info',
          );
        },
        onContinueEndless: () => {
          this.engine.openShop();
          this.modalsView.renderShop(this.engine.getSnapshot());
        },
        onRestart: () => {
          this.modalsView.showStartModal();
        },
      },
      this.selectedChassis,
    );

    this.bindGlobalControls();
    this.modalsView.updateRecord(loadRecord());
    this.renderAll(true);
  }

  private bindGlobalControls(): void {
    document.getElementById('btn-mute')!.addEventListener('click', () => {
      void this.audio.init();
      const next = !this.audio.isMuted();
      this.audio.setMuted(next);
      savePreferences({ muted: next });
      this.renderAll();
    });

    document.getElementById('btn-speed')!.addEventListener('click', () => {
      this.animSpeed = this.animSpeed === 1 ? 2 : 1;
      savePreferences({ animSpeed: this.animSpeed });
      this.hudView.showToast(`Velocità detonazione: ${this.animSpeed}×`, 'neutral');
      this.renderAll();
    });

    document.getElementById('btn-help')!.addEventListener('click', () => {
      this.modalsView.openHelp();
    });

    document.getElementById('btn-tut-skip')!.addEventListener('click', () => {
      this.exitTutorialToRun();
    });
    document.getElementById('btn-tut-finish')!.addEventListener('click', () => {
      this.exitTutorialToRun();
    });

    document.getElementById('btn-copy-seed')!.addEventListener('click', () => {
      const seed = this.engine.getSnapshot().seed;
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(seed);
      }
      this.hudView.showToast(`Seed copiato: ${seed}`, 'success');
    });

    window.addEventListener('keydown', (e) => {
      if (this.modalsView.isAnyModalOpen()) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const k = e.key.toLowerCase();
      if (k === 'q') this.selectTool('dig');
      else if (k === 'f') this.selectTool('pin');
      else if (k === '1') this.selectTool('c4');
      else if (k === '2') this.selectTool('arc');
      else if (k === '3') this.selectTool('cross');
      else if (k === '4') this.selectTool('amp');
      else if (k === '5') this.selectTool('prism');
      else if (k === '6') this.selectTool('siphon');
      else if (k === '7') this.selectTool('sonar');
      else if (k === 'z') this.handleUndoWire();
      else if (k === 'r') this.handleReverseWires();
      else if (e.code === 'Space') {
        e.preventDefault();
        void this.triggerDetonation();
      }
    });
  }

  private exitTutorialToRun(): void {
    this.engine.startNewRun(undefined, this.selectedChassis);
    this.hudView.setScoreImmediate(0);
    this.renderAll(true);
    this.hudView.showToast('Settore 1 iniziato! Buona demolizione.', 'info');
  }

  private selectTool(tool: ToolId): void {
    void this.audio.init();
    this.engine.setTool(tool);
    this.renderAll();
  }

  private handleCellAction(r: number, c: number, isSecondary: boolean): void {
    void this.audio.init();
    const fb = this.engine.handleCellAction(r, c, isSecondary);
    this.processFeedback(fb);
    this.renderAll();

    const snap = this.engine.getSnapshot();
    if (snap.isGameOver) {
      this.onGameOver();
    }
  }

  private handleUndoWire(): void {
    void this.audio.init();
    const fb = this.engine.undoLastWire();
    this.processFeedback(fb);
    this.renderAll();
  }

  private handleReverseWires(): void {
    void this.audio.init();
    const fb = this.engine.reverseWireOrder();
    this.processFeedback(fb);
    this.renderAll();
  }

  private handleDisarmAll(): void {
    void this.audio.init();
    const fb = this.engine.disarmAllWires();
    this.processFeedback(fb);
    this.renderAll();
  }

  private processFeedback(fb: ActionFeedback): void {
    if (fb.toast) {
      this.hudView.showToast(fb.toast, fb.toastTone ?? 'neutral');
    }
    if (fb.triggeredRelic) {
      this.relicView.triggerPop(fb.triggeredRelic.id, fb.triggeredRelic.label);
    }
    if (fb.popups) {
      for (const p of fb.popups) {
        this.fx.spawnPopup(p.r, p.c, p.text, p.color, Boolean(p.big));
      }
    }
    if (fb.hitMine && !fb.hitMine.autoWired) {
      this.fx.spawnExplosion(fb.hitMine.r, fb.hitMine.c, '#ff5636', 1.3);
      this.fx.flashBoard('rgba(255, 86, 54, 0.26)');
      this.fx.shakeBoard(10);
    }
    if (fb.sonarHit) {
      this.fx.spawnExplosion(fb.sonarHit.r, fb.sonarHit.c, '#4ade80', 1.25);
    }
    if (fb.bastionArmored && fb.bastionArmored.length > 0) {
      this.audio.playArmorSlam();
      this.fx.shakeBoard(5);
      // Pulse after render
      requestAnimationFrame(() => {
        this.boardView.pulseArmorSlam(fb.bastionArmored!);
      });
    }

    switch (fb.sfx) {
      case 'reveal':
        this.audio.playReveal(false);
        break;
      case 'reveal_big':
        this.audio.playReveal(true);
        break;
      case 'wire':
        this.audio.playWire((fb.sfxParam as WireModuleId) ?? 'c4');
        break;
      case 'unwire':
        this.audio.playWire('unwire');
        break;
      case 'pin':
        this.audio.playWire('pin');
        break;
      case 'sonar':
        this.audio.playSonar();
        break;
      case 'crystal':
        this.audio.playCrystal();
        break;
      case 'dud':
        this.audio.playDud();
        break;
      case 'buy':
        this.audio.playWire('buy');
        break;
    }
  }

  private async triggerDetonation(): Promise<void> {
    void this.audio.init();
    const preSnap = this.engine.getSnapshot();
    const est = this.engine.getSalvoEstimate();
    const resolution = this.engine.beginDetonation();
    if (!resolution) return;

    this.hoveredCell = null;
    this.renderAll();

    await playDetonationSequence(
      preSnap,
      resolution,
      est,
      this.animSpeed,
      this.audio,
      this.fx,
      this.boardView,
      this.hudView,
      this.relicView,
    );

    const outcome = this.engine.commitDetonation(resolution);
    this.renderAll();

    if (resolution.numberDrops.length > 0) {
      this.boardView.pulseDroppedNumbers(resolution.numberDrops);
    }

    window.setTimeout(() => this.hudView.setLiveChain(false), 1100);

    if (outcome.tutorialDone) {
      this.audio.playWin();
      this.hudView.showToast('Tutorial completato! Clicca INIZIA SETTORE 1.', 'success');
      return;
    }

    if (outcome.totalClearBonus > 0) {
      this.hudView.showToast(
        `SGOMBERO TOTALE! Tutte le mine detonate (+${outcome.totalClearBonus} PT)!`,
        'success',
      );
    } else if (resolution.salvoPoints > 0) {
      this.hudView.showToast(
        `Salva completata: ${resolution.chainCount} mine per +${resolution.salvoPoints} PT!`,
        'warn',
      );
    }

    const snap = this.engine.getSnapshot();

    if (outcome.gameOver) {
      this.onGameOver();
      return;
    }

    if (outcome.sectorCleared) {
      this.audio.playWin();
      const rec = saveRecord(
        snap.sector,
        snap.totalScore,
        snap.maxChain,
        outcome.campaignVictory,
      );
      this.modalsView.updateRecord(rec);

      window.setTimeout(() => {
        if (outcome.campaignVictory) {
          this.modalsView.showVictory(this.engine.getSnapshot());
        } else {
          this.engine.openShop();
          this.modalsView.renderShop(this.engine.getSnapshot());
        }
      }, 520);
    }
  }

  private onGameOver(): void {
    const snap = this.engine.getSnapshot();
    this.audio.playFail();
    const rec = saveRecord(snap.sector, snap.totalScore, snap.maxChain, false);
    this.modalsView.updateRecord(rec);
    window.setTimeout(() => {
      this.modalsView.showGameOver(this.engine.getSnapshot());
    }, 360);
  }

  private handleDraftRelic(id: RelicId): void {
    if (!this.engine.draftRelic(id)) return;
    this.audio.playWire('amp');
    this.renderAll();
    this.modalsView.renderShop(this.engine.getSnapshot());
  }

  private handleSkipRelic(): void {
    if (!this.engine.skipRelicDraft()) return;
    this.audio.playWire('buy');
    this.renderAll();
    this.modalsView.renderShop(this.engine.getSnapshot());
  }

  private handleRerollRelics(): void {
    if (!this.engine.rerollShopRelics()) return;
    this.audio.playWire('arc');
    this.renderAll();
    this.modalsView.renderShop(this.engine.getSnapshot());
  }

  private handleBuyUpgrade(id: ShopUpgradeId): void {
    if (!this.engine.buyUpgrade(id)) return;
    this.audio.playWire('buy');
    this.renderAll();
    this.modalsView.renderShop(this.engine.getSnapshot());
  }

  private renderAll(forceFxLayout = false): void {
    const snap = this.engine.getSnapshot();
    const est = this.engine.getSalvoEstimate();

    const rebuilt = this.boardView.render(snap);
    this.hudView.render(snap, est, this.audio.isMuted(), this.animSpeed);
    this.dockView.render(snap, est);
    this.relicView.render(snap.relics);

    const wiredCount = snap.board.flat().filter((c) => c.wire !== null).length;
    this.audio.setTensionLevel(wiredCount, snap.isDetonating);

    if (rebuilt || forceFxLayout) {
      requestAnimationFrame(() => this.fx.syncLayout());
    }
  }
}
