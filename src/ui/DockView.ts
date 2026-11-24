import gsap from 'gsap';
import { getModuleStats, MODULES } from '../data/modules';
import { getWiredCells } from '../engine/MinesweeperLogic';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { GameSnapshot, SalvoBreakdown, ToolId, WireModuleId } from '../types/game';
import { MODULE_ICONS } from './icons';

const DOCK_TOOLS: ToolId[] = ['dig', 'pin', 'c4', 'arc', 'cross', 'amp', 'prism', 'siphon'];

export class DockView {
  private extractBar = document.getElementById('extract-bar')!;
  private extractBtn = document.getElementById('btn-extract-now') as HTMLButtonElement;

  private explainer = document.getElementById('tool-explainer')!;
  private explainerIcon = document.getElementById('tool-explainer-icon')!;
  private explainerName = document.getElementById('tool-explainer-name')!;
  private explainerDesc = document.getElementById('tool-explainer-desc')!;

  private formulaBar = document.getElementById('formula-bar')!;
  private formulaTerms = document.getElementById('formula-terms')!;
  private formulaTotal = document.getElementById('formula-total')!;
  private sequenceStrip = document.getElementById('sequence-strip')!;

  private detonateBtn = document.getElementById('btn-detonate') as HTMLButtonElement;
  private detonateLabel = document.getElementById('btn-detonate-label')!;
  private detonateBadge = document.getElementById('btn-detonate-badge')!;
  private sonarBtn = document.getElementById('btn-sonar-dock') as HTMLButtonElement;
  private sonarCharge = document.getElementById('charge-sonar')!;

  private wireUtilsRow = document.getElementById('wire-utils-row')!;
  private undoBtn = document.getElementById('btn-undo-wire') as HTMLButtonElement;
  private reverseBtn = document.getElementById('btn-reverse-wire') as HTMLButtonElement;
  private disarmBtn = document.getElementById('btn-disarm-all') as HTMLButtonElement;
  private toolsGrid = document.getElementById('tools-grid')!;

  private toolButtons = new Map<ToolId, HTMLButtonElement>();
  private onNudgeWire: (index: number) => void;
  private lastExplainerKey = '';
  private wasArmed = false;
  private wasExtractable = false;

  constructor(
    onSelectTool: (tool: ToolId) => void,
    onDetonate: () => void,
    onUndo: () => void,
    onReverse: () => void,
    onDisarm: () => void,
    onNudgeWire: (index: number) => void,
    onExtract: () => void,
  ) {
    this.onNudgeWire = onNudgeWire;
    this.buildToolKeys(onSelectTool);

    this.sonarBtn.addEventListener('click', () => onSelectTool('sonar'));
    this.detonateBtn.addEventListener('click', onDetonate);
    this.undoBtn.addEventListener('click', onUndo);
    this.reverseBtn.addEventListener('click', onReverse);
    this.disarmBtn.addEventListener('click', onDisarm);
    this.extractBtn.addEventListener('click', onExtract);
  }

  private buildToolKeys(onSelectTool: (tool: ToolId) => void): void {
    this.toolsGrid.innerHTML = '';
    for (const id of DOCK_TOOLS) {
      const def = MODULES[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tool-key';
      btn.dataset.tool = id;
      btn.dataset.accent = def.accent;
      btn.title = `${def.name} — ${def.summary}`;
      btn.innerHTML = `
        <span class="tool-lv-badge hidden" data-lv="${id}">Lv2</span>
        <div class="tool-key-top">
          ${MODULE_ICONS[id]}
          <span class="tool-key-meta" data-meta="${id}">${def.isWire ? '×0' : id === 'dig' ? '1M' : '∞'}</span>
        </div>
        <span class="tool-key-name">${def.shortName}</span>
      `;
      btn.addEventListener('click', () => onSelectTool(id));
      this.toolButtons.set(id, btn);
      this.toolsGrid.appendChild(btn);
    }
  }

  render(snap: GameSnapshot, est: SalvoBreakdown): void {
    const wiredList = getWiredCells(snap.board);
    const wiredCount = wiredList.length;
    const tutSpec = snap.tutorialMode ? TUTORIAL_STEPS[snap.tutorialStep] : undefined;

    // 0. Push Your Luck Extract Banner
    const showExtract = snap.canExtract && !snap.isDetonating && !snap.tutorialMode;
    this.extractBar.classList.toggle('hidden', !showExtract);
    if (showExtract && !this.wasExtractable) {
      gsap.fromTo(
        this.extractBar,
        { opacity: 0, y: -6, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.8)' },
      );
    }
    this.wasExtractable = showExtract;

    // 1. Always-visible Active Tool Explainer (with current Lv if upgraded!)
    const activeDef = MODULES[snap.activeTool];
    const activeLv = activeDef.isWire
      ? snap.moduleLevels[snap.activeTool as WireModuleId]
      : 1;
    const explainerKey = `${snap.activeTool}:${activeLv}`;
    if (this.lastExplainerKey !== explainerKey) {
      this.lastExplainerKey = explainerKey;
      this.explainer.dataset.accent = activeDef.accent;
      this.explainerIcon.innerHTML = MODULE_ICONS[snap.activeTool];
      this.explainerName.textContent =
        activeLv > 1 ? `${activeDef.name} Lv.${activeLv}` : activeDef.name;
      this.explainerDesc.textContent = activeDef.isWire
        ? this.formatLeveledSummary(snap.activeTool as WireModuleId, activeLv, activeDef.summary)
        : activeDef.summary;
      gsap.fromTo(
        this.explainer,
        { opacity: 0.65, y: 2 },
        { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' },
      );
    }

    // 2. Smart Formula Bar & Interactive Sequence Reorder Strip
    const isArmed = wiredCount > 0;
    this.formulaBar.classList.toggle('hidden', !isArmed);
    this.wireUtilsRow.classList.toggle('hidden', !isArmed || snap.tutorialMode);

    if (isArmed) {
      const clears = est.willClearQuota && !snap.omegaCoreAlive;
      this.formulaBar.classList.toggle('clears', clears);
      this.formulaTerms.innerHTML = `
        <span class="f-chip base">${est.totalBase}</span>
        <span class="f-op">×</span>
        <span class="f-chip local">×${est.avgLocalMult.toFixed(1)}</span>
        <span class="f-op">×</span>
        <span class="f-chip mult">×${est.endMult.toFixed(2)}</span>
      `;
      this.formulaTotal.textContent = `~${est.totalPoints}${est.hasPotentialChain ? '+' : ''} PT${clears ? ' ✓' : ''}`;

      if (!this.wasArmed) {
        gsap.fromTo(
          this.formulaBar,
          { opacity: 0, y: -4 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
        );
      }
    }
    this.wasArmed = isArmed;

    // Interactive Tap-to-Reorder Sequence Strip (#1 -> #N) when >= 2 bombs armed
    const showSeq = wiredCount >= 2 && !snap.isDetonating && !snap.tutorialMode;
    this.sequenceStrip.classList.toggle('hidden', !showSeq);
    if (showSeq) {
      this.sequenceStrip.innerHTML = '';
      wiredList.forEach((cell, idx) => {
        const mod = MODULES[cell.wire!];
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'seq-chip';
        chip.dataset.accent = mod.accent;
        chip.title =
          idx === 0
            ? 'Tocca per spostare in fondo'
            : `Tocca per anticipare al posto #${idx}`;
        chip.innerHTML = `<span class="seq-num">${idx + 1}</span><span>${mod.shortName}</span>`;
        chip.addEventListener('click', () => this.onNudgeWire(idx));
        this.sequenceStrip.appendChild(chip);

        if (idx < wiredList.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'seq-arrow';
          arrow.textContent = '→';
          this.sequenceStrip.appendChild(arrow);
        }
      });
    }

    // 3. Detonate Trigger
    const canDetonate =
      wiredCount > 0 &&
      !snap.isDetonating &&
      (!snap.tutorialMode || snap.tutorialStep === 4);
    this.detonateBtn.disabled = !canDetonate;
    this.detonateBtn.classList.toggle('armed', canDetonate);
    this.detonateBtn.classList.toggle('disarmed', !canDetonate);
    this.detonateBtn.classList.toggle('btn-tut-target', Boolean(tutSpec?.highlightDetonate));
    this.detonateLabel.textContent = snap.isDetonating ? 'ESPLOSIONE...' : 'DETONA';

    if (wiredCount > 0) {
      this.detonateBadge.classList.remove('hidden');
      this.detonateBadge.textContent = `${wiredCount}`;
    } else {
      this.detonateBadge.classList.add('hidden');
    }

    // 4. Radar quick button
    this.sonarBtn.classList.toggle('active', snap.activeTool === 'sonar');
    this.sonarBtn.disabled = snap.charges.sonar <= 0 || snap.isDetonating;
    this.sonarCharge.textContent = `×${snap.charges.sonar}`;

    // 5. Wire utilities
    const canEditWires = wiredCount > 0 && !snap.isDetonating && !snap.tutorialMode;
    this.undoBtn.disabled = !canEditWires;
    this.reverseBtn.disabled = !canEditWires || wiredCount < 2;
    this.disarmBtn.disabled = !canEditWires;

    // 6. 4x2 Labeled Tool Keys + Level Badges
    for (const [id, btn] of this.toolButtons) {
      const def = MODULES[id];
      const isActive = snap.activeTool === id;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle(
        'btn-tut-target',
        Boolean(tutSpec?.requiredTool === id && !isActive),
      );
      if (def.isWire) {
        const wId = id as WireModuleId;
        const count = snap.charges[wId];
        const lv = snap.moduleLevels[wId];
        const meta = btn.querySelector(`[data-meta="${id}"]`);
        if (meta) meta.textContent = `×${count}`;
        const lvBadge = btn.querySelector(`[data-lv="${id}"]`);
        if (lvBadge) {
          lvBadge.classList.toggle('hidden', lv <= 1);
          lvBadge.textContent = `Lv${lv}`;
        }
        btn.classList.toggle('empty', count <= 0);
      }
    }
  }

  private formatLeveledSummary(
    id: WireModuleId,
    lv: number,
    fallback: string,
  ): string {
    if (lv <= 1) return fallback;
    const st = getModuleStats(id, lv);
    switch (id) {
      case 'c4':
        return `${st.basePts} pt base + ${st.c4PerAdj} per ogni numero scoperto vicino.`;
      case 'arc':
        return `${st.basePts} pt · +${st.arcPerLink}× per link in linea (si ferma ai muri).`;
      case 'cross':
        return `${st.basePts} pt · Raggio ${st.crossRange} caselle! Spacca corazze e barili.`;
      case 'amp':
        return `${st.basePts} pt · +${st.ampChainBonus}× combo e raddoppia (×2) i vicini!`;
      case 'prism':
        return `${st.basePts} pt · Piega i Fulmini a 90° (+${st.prismPerDeflect}× per rimbalzo).`;
      case 'siphon':
        return `${st.basePts} pt · +${st.siphonCredits} monete e +${st.siphonMoves} mosse extra!`;
    }
  }
}
