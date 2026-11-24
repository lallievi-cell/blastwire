import { RELIC_BY_ID } from '../data/relics';
import type { RelicId } from '../types/game';

export class RelicStripView {
  private cardEl: HTMLElement;
  private container: HTMLElement;
  private countEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private tipNameEl: HTMLElement;
  private tipDescEl: HTMLElement;
  private pillMap = new Map<RelicId, HTMLButtonElement>();
  private renderedKey = '';
  private hideTimer = 0;

  constructor(
    cardEl: HTMLElement,
    container: HTMLElement,
    countEl: HTMLElement,
    tooltipEl: HTMLElement,
    tipNameEl: HTMLElement,
    tipDescEl: HTMLElement,
  ) {
    this.cardEl = cardEl;
    this.container = container;
    this.countEl = countEl;
    this.tooltipEl = tooltipEl;
    this.tipNameEl = tipNameEl;
    this.tipDescEl = tipDescEl;
  }

  render(relics: RelicId[]): void {
    // Hide the whole card while empty so mobile screen space goes to the board & tools!
    this.cardEl.classList.toggle('hidden', relics.length === 0);
    this.countEl.textContent = `${relics.length} attiv${relics.length === 1 ? 'o' : 'i'}`;

    const nextKey = relics.join(',');
    if (nextKey === this.renderedKey) return;
    this.renderedKey = nextKey;

    this.pillMap.clear();
    this.container.innerHTML = '';

    for (const id of relics) {
      const def = RELIC_BY_ID[id];
      if (!def) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'relic-pill';
      btn.dataset.accent = def.accent;
      btn.innerHTML = `<span class="relic-pill-tag">${def.tag}</span><span>${def.name}</span>`;

      const showTip = () => {
        window.clearTimeout(this.hideTimer);
        this.tipNameEl.textContent = `${def.name} · ${def.rarity}`;
        this.tipDescEl.textContent = def.desc;
        this.tooltipEl.classList.remove('hidden');
        const rect = btn.getBoundingClientRect();
        const left = Math.min(window.innerWidth - 272, Math.max(10, rect.left));
        const top = Math.max(10, rect.top - this.tooltipEl.offsetHeight - 8);
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
      };

      const hideTip = () => {
        this.tooltipEl.classList.add('hidden');
      };

      btn.addEventListener('mouseenter', showTip);
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showTip();
        this.hideTimer = window.setTimeout(hideTip, 2600);
      });

      this.pillMap.set(id, btn);
      this.container.appendChild(btn);
    }
  }

  triggerPop(id: RelicId, label: string): void {
    const pill = this.pillMap.get(id);
    if (!pill) return;

    pill.classList.remove('pop');
    void pill.offsetWidth;
    pill.classList.add('pop');

    const floater = document.createElement('span');
    floater.className = 'relic-pop-float';
    floater.textContent = label;
    pill.appendChild(floater);
    window.setTimeout(() => floater.remove(), 760);
  }
}
