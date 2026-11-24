import { MODULES } from '../data/modules';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { GameSnapshot, SalvoBreakdown, ToolId, WireModuleId } from '../types/game';
import { MODULE_ICONS } from './icons';

const DOCK_TOOLS: ToolId[] = ['dig', 'pin', 'c4', 'arc', 'cross', 'amp', 'prism', 'siphon'];

export class DockView {
  private formulaBar = document.getElementById('formula-bar')!;
  private detonateBtn = document.getElementById('btn-detonate') as HTMLButtonElement;
  private detonateBadge = document.getElementById('btn-detonate-badge')!;
  private sonarBtn = document.getElementById('btn-sonar-dock') as HTMLButtonElement;
  private sonarCharge = document.getElementById('charge-sonar')!;
  private undoBtn = document.getElementById('btn-undo-wire') as HTMLButtonElement;
  private reverseBtn = document.getElementById('btn-reverse-wire') as HTMLButtonElement;
  private disarmBtn = document.getElementById('btn-disarm-all') as HTMLButtonElement;
  private toolsGrid = document.getElementById('tools-grid')!;
  private descBox = document.getElementById('tool-desc-box')!;

  private toolButtons = new Map<ToolId, HTMLButtonElement>();

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
      btn.title = `${def.name} (${def.hotkey}) — ${def.summary}`;
      btn.innerHTML = `
        <span class="tool-key-hotkey">${def.hotkey}</span>
        ${MODULE_ICONS[id]}
        <span class="tool-key-name">${def.shortName}</span>
        <span class="tool-key-meta" data-meta="${id}">${def.isWire ? '×0' : id === 'dig' ? '1M' : 'FREE'}</span>
      `;
      btn.addEventListener('click', () => onSelectTool(id));
      this.toolButtons.set(id, btn);
      this.toolsGrid.appendChild(btn);
    }
  }

  render(snap: GameSnapshot, est: SalvoBreakdown): void {
    const wiredCount = snap.board.flat().filter((c) => c.wire !== null).length;
    const tutSpec = snap.tutorialMode ? TUTORIAL_STEPS[snap.tutorialStep] : undefined;

    // 1. Live Balatro-style Salvo Formula Bar
    if (wiredCount === 0) {
      this.formulaBar.className = 'formula-bar idle';
      this.formulaBar.innerHTML = `
        <span>Cabla 1+ mine per calcolare la salva</span>
        <span class="formula-total">0 PT</span>
      `;
    } else {
      const clears = est.willClearQuota && !snap.omegaCoreAlive;
      this.formulaBar.className = `formula-bar${clears ? ' clears' : ''}`;
      this.formulaBar.innerHTML = `
        <div class="formula-terms">
          <span class="f-chip base" title="Somma punteggi base">${est.totalBase}</span>
          <span class="f-op">×</span>
          <span class="f-chip local" title="Moltiplicatore locale medio (Amp/Hotspot/Reliquie)">×${est.avgLocalMult.toFixed(1)}</span>
          <span class="f-op">×</span>
          <span class="f-chip mult" title="Moltiplicatore catena finale">×${est.endMult.toFixed(2)}</span>
        </div>
        <span class="formula-total">~${est.totalPoints}${est.hasPotentialChain ? '+' : ''} PT${clears ? ' ✓' : ''}</span>
      `;
    }

    // 2. Detonate Trigger
    const canDetonate =
      wiredCount > 0 &&
      !snap.isDetonating &&
      (!snap.tutorialMode || snap.tutorialStep === 4);
    this.detonateBtn.disabled = !canDetonate;
    this.detonateBtn.classList.toggle('armed', canDetonate);
    this.detonateBtn.classList.toggle('disarmed', !canDetonate);
    this.detonateBtn.classList.toggle('btn-tut-target', Boolean(tutSpec?.highlightDetonate));

    if (wiredCount > 0) {
      this.detonateBadge.classList.remove('hidden');
      this.detonateBadge.textContent = `${wiredCount}`;
    } else {
      this.detonateBadge.classList.add('hidden');
    }

    // 3. Sonar quick button
    this.sonarBtn.classList.toggle('active', snap.activeTool === 'sonar');
    this.sonarBtn.disabled = snap.charges.sonar <= 0 || snap.isDetonating;
    this.sonarCharge.textContent = `×${snap.charges.sonar}`;

    // 4. Wire order utilities (Undo / Reverse / Disarm)
    const canEditWires = wiredCount > 0 && !snap.isDetonating && !snap.tutorialMode;
    this.undoBtn.disabled = !canEditWires;
    this.reverseBtn.disabled = !canEditWires || wiredCount < 2;
    this.disarmBtn.disabled = !canEditWires;

    // 5. Module Keys
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

    // 6. Active tool description
    const activeDef = MODULES[snap.activeTool];
    this.descBox.innerHTML = `<strong>${activeDef.name}:</strong> ${activeDef.description}`;
  }
}
