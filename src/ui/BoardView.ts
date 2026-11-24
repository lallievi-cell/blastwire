import { getNeighbors, getNumberMarkStatus } from '../engine/MinesweeperLogic';
import { TUTORIAL_STEPS } from '../tutorial/scenarios';
import type { Cell, GameSnapshot } from '../types/game';
import { MODULE_ICONS, TILE_ICONS } from './icons';

export interface BoardCallbacks {
  onCellAction: (r: number, c: number, isSecondary: boolean) => void;
  onHoverChange: (cell: { r: number; c: number } | null) => void;
}

export class BoardView {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private callbacks: BoardCallbacks;

  private gridRows = 0;
  private gridCols = 0;
  private cellEls: HTMLElement[][] = [];
  private prevStateKey: string[][] = [];
  private focusedNeighbors: HTMLElement[] = [];
  private lastBoardSnapshot: Cell[][] = [];

  // Touch long-press tracking
  private pressTimer: number | null = null;
  private pressingEl: HTMLElement | null = null;
  private longPressFired = false;

  constructor(
    container: HTMLElement,
    wrapper: HTMLElement,
    callbacks: BoardCallbacks,
  ) {
    this.container = container;
    this.wrapper = wrapper;
    this.callbacks = callbacks;
    this.attachDelegatedEvents();
  }

  private getCellFromTarget(target: EventTarget | null): { r: number; c: number; el: HTMLElement } | null {
    if (!(target instanceof Element)) return null;
    const el = target.closest('.grid-cell') as HTMLElement | null;
    if (!el || !this.container.contains(el)) return null;
    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c, el };
  }

  private clearNeighborFocus(): void {
    for (const el of this.focusedNeighbors) {
      el.classList.remove('neighbor-focus', 'neighbor-chord-safe');
    }
    this.focusedNeighbors = [];
  }

  private highlightNeighborsIfNumber(r: number, c: number): void {
    this.clearNeighborFocus();
    const cell = this.lastBoardSnapshot[r]?.[c];
    if (!cell || !cell.revealed || cell.scrambled || cell.adjMines <= 0) return;

    const status = getNumberMarkStatus(this.lastBoardSnapshot, cell);
    const focusClass = status === 'exact' ? 'neighbor-chord-safe' : 'neighbor-focus';

    for (const n of getNeighbors(this.lastBoardSnapshot, r, c)) {
      if (!n.revealed && !n.wall && !n.barrel && !n.armored && !n.wire && !n.pinned) {
        const nel = this.cellEls[n.r]?.[n.c];
        if (nel) {
          nel.classList.add(focusClass);
          this.focusedNeighbors.push(nel);
        }
      }
    }
  }

  private cancelLongPress(): void {
    if (this.pressTimer !== null) {
      window.clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    if (this.pressingEl) {
      this.pressingEl.classList.remove('cell-pressing');
      this.pressingEl = null;
    }
  }

  private attachDelegatedEvents(): void {
    this.container.addEventListener('click', (e) => {
      const hit = this.getCellFromTarget(e.target);
      if (!hit) return;
      e.preventDefault();
      if (this.longPressFired) {
        this.longPressFired = false;
        return;
      }
      this.callbacks.onCellAction(hit.r, hit.c, false);
    });

    this.container.addEventListener('contextmenu', (e) => {
      const hit = this.getCellFromTarget(e.target);
      if (!hit) return;
      e.preventDefault();
      this.callbacks.onCellAction(hit.r, hit.c, true);
    });

    this.container.addEventListener(
      'touchstart',
      (e) => {
        const hit = this.getCellFromTarget(e.target);
        if (!hit) return;
        this.cancelLongPress();
        this.longPressFired = false;
        this.pressingEl = hit.el;
        hit.el.classList.add('cell-pressing');
        this.pressTimer = window.setTimeout(() => {
          this.pressTimer = null;
          if (this.pressingEl) {
            this.pressingEl.classList.remove('cell-pressing');
            this.pressingEl = null;
          }
          this.longPressFired = true;
          this.callbacks.onCellAction(hit.r, hit.c, true);
        }, 300);
      },
      { passive: true },
    );

    const endTouch = () => this.cancelLongPress();
    this.container.addEventListener('touchend', endTouch);
    this.container.addEventListener('touchmove', endTouch);
    this.container.addEventListener('touchcancel', endTouch);

    this.container.addEventListener('pointerover', (e) => {
      const hit = this.getCellFromTarget(e.target);
      if (!hit) return;
      this.callbacks.onHoverChange({ r: hit.r, c: hit.c });
      this.highlightNeighborsIfNumber(hit.r, hit.c);
    });

    this.container.addEventListener('pointerleave', () => {
      this.callbacks.onHoverChange(null);
      this.clearNeighborFocus();
    });
  }

  private ensureGridDOM(rows: number, cols: number): boolean {
    if (this.gridRows === rows && this.gridCols === cols) return false;
    this.gridRows = rows;
    this.gridCols = cols;
    this.container.innerHTML = '';
    this.container.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    this.container.classList.toggle('dense', cols >= 9);

    this.cellEls = [];
    this.prevStateKey = [];

    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      const elRow: HTMLElement[] = [];
      const keyRow: string[] = [];
      for (let c = 0; c < cols; c++) {
        const el = document.createElement('div');
        el.className = 'grid-cell cell-hidden';
        el.dataset.r = String(r);
        el.dataset.c = String(c);
        elRow.push(el);
        keyRow.push('');
        frag.appendChild(el);
      }
      this.cellEls.push(elRow);
      this.prevStateKey.push(keyRow);
    }
    this.container.appendChild(frag);
    return true;
  }

  /** Renders board via dirty-cell diffing. Returns true if grid dimensions changed. */
  render(snap: GameSnapshot, overrideBoard?: Cell[][]): boolean {
    const board = overrideBoard ?? snap.board;
    this.lastBoardSnapshot = board;
    const rows = board.length;
    const cols = board[0]?.length ?? 0;
    const rebuilt = this.ensureGridDOM(rows, cols);

    const wiredCount = board.flat().filter((c) => c.wire !== null).length;
    this.wrapper.classList.toggle('danger-low', snap.shields === 1);
    this.wrapper.classList.toggle('armed-ready', wiredCount > 0 && snap.shields > 1);

    const tutTarget = snap.tutorialMode
      ? TUTORIAL_STEPS[snap.tutorialStep]?.targetCell
      : undefined;

    const hasHotspotMaster = snap.relics.includes('hotspot_master');

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const markStatus = getNumberMarkStatus(board, cell);
        const hasUnopened =
          cell.revealed && cell.adjMines > 0
            ? getNeighbors(board, r, c).some(
                (n) =>
                  !n.revealed &&
                  !n.wall &&
                  !n.barrel &&
                  !n.armored &&
                  !n.wire &&
                  !n.pinned,
              )
            : false;
        const isTutTarget =
          tutTarget !== undefined && tutTarget.r === r && tutTarget.c === c;

        const key = `${cell.wall ? 1 : 0}|${cell.barrel ? 1 : 0}|${
          cell.bastionTarget ? 1 : 0
        }|${cell.armored ? 1 : 0}|${cell.revealed ? 1 : 0}|${cell.crater ? 1 : 0}|${
          cell.scrambled ? 1 : 0
        }|${cell.adjMines}|${cell.wire ?? ''}|${cell.wireOrder}|${
          cell.pinned ? 1 : 0
        }|${cell.sonarPing ? 1 : 0}|${cell.crystal ? 1 : 0}|${
          cell.hotspot ? (hasHotspotMaster ? 3 : 2) : 0
        }|${cell.omegaCore ? 1 : 0}|${cell.omegaShield ? 1 : 0}|${markStatus}|${
          hasUnopened ? 1 : 0
        }|${isTutTarget ? 1 : 0}`;

        if (!rebuilt && this.prevStateKey[r][c] === key) continue;
        const wasRevealed = this.prevStateKey[r][c].split('|')[4] === '1';
        this.prevStateKey[r][c] = key;

        const el = this.cellEls[r][c];
        this.patchCellElement(
          el,
          cell,
          markStatus,
          hasUnopened,
          hasHotspotMaster,
          isTutTarget,
          !rebuilt && !wasRevealed && cell.revealed,
        );
      }
    }

    return rebuilt;
  }

  private patchCellElement(
    el: HTMLElement,
    cell: Cell,
    markStatus: 'under' | 'exact' | 'over',
    hasUnopened: boolean,
    hasHotspotMaster: boolean,
    isTutTarget: boolean,
    justRevealed: boolean,
  ): void {
    const classes: string[] = ['grid-cell'];
    let html = '';

    if (cell.wall) {
      classes.push('cell-wall');
      html = TILE_ICONS.wall;
    } else if (cell.barrel) {
      classes.push('cell-barrel');
      html = `${TILE_ICONS.barrel}<span class="tile-subtag barrel">3×3</span>`;
    } else if (cell.armored) {
      classes.push('cell-armored');
      html = TILE_ICONS.armor;
    } else if (cell.revealed) {
      classes.push(cell.crater ? 'cell-crater' : 'cell-revealed');
      if (justRevealed) classes.push('cell-just-revealed');

      if (cell.scrambled) {
        html = `<span class="cell-emp-mark" title="Numero disturbato: fai esplodere una bomba vicina">?</span>`;
      } else if (cell.adjMines > 0) {
        classes.push(`num-${cell.adjMines}`, 'chordable');
        if (markStatus === 'exact' && hasUnopened) {
          classes.push('chord-ready');
          html = `<span class="cell-num-glyph">${cell.adjMines}</span><span class="chord-check">✓</span>`;
        } else if (markStatus === 'exact') {
          classes.push('chord-done');
          html = `<span class="cell-num-glyph">${cell.adjMines}</span>`;
        } else if (markStatus === 'over') {
          classes.push('over-flagged');
          html = `<span class="cell-num-glyph">${cell.adjMines}</span>`;
        } else {
          html = `<span class="cell-num-glyph">${cell.adjMines}</span>`;
        }
      } else if (cell.crater) {
        html = TILE_ICONS.crater;
      } else {
        html = `<span class="cell-zero-dot"></span>`;
      }
    } else {
      // Covered tile
      const multTag = hasHotspotMaster ? '×3' : '×2';
      let badges = '';
      if (cell.hotspot) {
        badges += `<span class="tile-corner-tag gold">${multTag}</span>`;
      }
      if (cell.crystal) {
        badges += `<span class="tile-corner-tag cyan${cell.hotspot ? ' left' : ''}">+₡</span>`;
      }

      if (cell.wire) {
        classes.push('cell-wired', `cell-wired-${cell.wire}`);
        if (cell.omegaCore) {
          classes.push('cell-omega-core');
          if (cell.omegaShield) classes.push('cell-omega-shielded');
        }
        html = `${MODULE_ICONS[cell.wire]}<span class="wire-order-badge">${cell.wireOrder}</span>${badges}`;
      } else if (cell.omegaCore) {
        classes.push('cell-omega-core');
        if (cell.omegaShield) classes.push('cell-omega-shielded');
        html = `${TILE_ICONS.omegaCore}<span class="tile-subtag omega">${cell.omegaShield ? 'SCUDO' : 'NUCLEO'}</span>`;
      } else if (cell.pinned) {
        classes.push('cell-pinned');
        html = `${MODULE_ICONS.pin}${badges}`;
      } else {
        classes.push('cell-hidden');
        if (cell.sonarPing) {
          classes.push('cell-sonar-ping');
          html = `${TILE_ICONS.sonarPing}${badges}`;
        } else if (cell.crystal) {
          html = `<span class="tile-embed-icon crystal">${TILE_ICONS.crystal}</span>${badges}`;
        } else if (cell.hotspot) {
          html = `<span class="tile-embed-icon hotspot">${TILE_ICONS.hotspot}</span>${badges}`;
        } else {
          html = badges;
        }
      }

      if (cell.crystal) classes.push('cell-crystal');
      if (cell.hotspot) classes.push('cell-hotspot');
      if (cell.bastionTarget) {
        classes.push('cell-bastion-target');
        html += `<span class="bastion-reticle-overlay">${TILE_ICONS.bastionReticle}</span>`;
      }
    }

    if (isTutTarget) classes.push('cell-tut-target');

    el.className = classes.join(' ');
    el.innerHTML = html;
  }

  pulseDroppedNumbers(coords: { r: number; c: number }[]): void {
    for (const { r, c } of coords) {
      const el = this.cellEls[r]?.[c];
      if (!el) continue;
      el.classList.remove('cell-num-dropped');
      void el.offsetWidth;
      el.classList.add('cell-num-dropped');
    }
  }

  pulseArmorSlam(coords: { r: number; c: number }[]): void {
    for (const { r, c } of coords) {
      const el = this.cellEls[r]?.[c];
      if (!el) continue;
      el.classList.remove('cell-armor-slam');
      void el.offsetWidth;
      el.classList.add('cell-armor-slam');
    }
  }
}
