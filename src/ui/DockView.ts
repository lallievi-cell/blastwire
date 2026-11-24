import gsap from 'gsap';
import { MODULES } from '../data/modules';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { GameSnapshot, SalvoBreakdown, ToolId, WireModuleId } from '../types/game';
import { MODULE_ICONS } from './icons';

const DOCK_TOOLS: ToolId[] = ['dig', 'pin', 'c4', 'arc', 'cross', 'amp', 'prism', 'siphon'];

export class DockView {
  private explainer = document.getElementById('tool-explainer')!;
  private explainerIcon = document.getElementById('tool-explainer-icon')!;
  private explainerName = document.getElementById('tool-explainer-name')!;
  private explainerDesc = document.getElementById('tool-explainer-desc')!;

  private formulaBar = document.getElementById('formula-bar')!;
  private formulaTerms = document.getElementById('formula-terms')!;
  private formulaTotal = document.getElementById('formula-total')!;

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
  private lastActiveTool: ToolId | null = null;
  private wasArmed = false;

  constructor(
    onSelectTool: (tool: ToolId) => void,
    onDetonate: () => void,
    onUndo: () => void,
    onReverse: () => void,
    onDisarm: () => void,
  ) {
    this.buildToolKeys(onSelectTool);

    this.sonarBtn.addEventListener('click', () => onSelectTool('sonar'));
    this.detonateBtn.addEventListener('click', onDetonate);
    this.undoBtn.addEventListener('click', onUndo);
    this.reverseBtn.addEventListener('click', onReverse);
    this.disarmBtn.addEventListener('click', onDisarm);
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
    const wiredCount = snap.board.flat().filter((c) => c.wire !== null).length;
    const tutSpec = snap.tutorialMode ? TUTORIAL_STEPS[snap.tutorialStep] : undefined;

    // 1. Always-visible Active Tool Explainer (instant clarity on mobile & desktop!)
    const activeDef = MODULES[snap.activeTool];
    if (this.lastActiveTool !== snap.activeTool) {
      this.lastActiveTool = snap.activeTool;
      this.explainer.dataset.accent = activeDef.accent;
      this.explainerIcon.innerHTML = MODULE_ICONS[snap.activeTool];
      this.explainerName.textContent = activeDef.name;
      this.explainerDesc.textContent = activeDef.summary;
      gsap.fromTo(
        this.explainer,
        { opacity: 0.65, y: 2 },
        { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' },
      );
    }

    // 2. Smart Formula Bar & Wire Order Controls (appear ONLY when >=1 bomb armed!)
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

    // 6. 4x2 Labeled Tool Keys
    for (const [id, btn] of this.toolButtons) {
      const def = MODULES[id];
      const isActive = snap.activeTool === id;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle(
        'btn-tut-target',
        Boolean(tutSpec?.requiredTool === id && !isActive),
      );
      if (def.isWire) {
        const count = snap.charges[id as WireModuleId];
        const meta = btn.querySelector(`[data-meta="${id}"]`);
        if (meta) meta.textContent = `×${count}`;
        btn.classList.toggle('empty', count <= 0);
      }
    }
  }
}
