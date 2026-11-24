import { CHASSIS_LIST } from '../data/chassis';
import { RELIC_BY_ID } from '../data/relics';
import { getRerollCost, getUpgradeCost, SHOP_UPGRADES } from '../data/shop';
import { generateReadableSeed } from '../engine/prng';
import type {
  ChassisId,
  GameSnapshot,
  RelicId,
  RunRecord,
  ShopUpgradeId,
} from '../types/game';
import { MODULE_ICONS, UI_ICONS } from './icons';

export interface ModalCallbacks {
  onSelectChassis: (id: ChassisId) => void;
  onStartGame: (seed: string) => void;
  onStartTutorial: () => void;
  onDraftRelic: (id: RelicId) => void;
  onSkipRelic: () => void;
  onRerollRelics: () => void;
  onBuyUpgrade: (id: ShopUpgradeId) => void;
  onNextSector: () => void;
  onContinueEndless: () => void;
  onRestart: () => void;
}

export class ModalsView {
  private modalStart = document.getElementById('modal-start')!;
  private startBestBox = document.getElementById('start-best-box')!;
  private startBestVal = document.getElementById('start-best-val')!;
  private chassisGrid = document.getElementById('start-chassis-grid')!;
  private seedInput = document.getElementById('start-seed-input') as HTMLInputElement;
  private seedRandomBtn = document.getElementById('btn-random-seed')!;

  private modalHelp = document.getElementById('modal-help')!;
  private modalShop = document.getElementById('modal-shop')!;
  private shopCredits = document.getElementById('shop-credits')!;
  private shopShields = document.getElementById('shop-shields')!;
  private shopSummary = document.getElementById('shop-bonus-summary')!;
  private shopRelics = document.getElementById('shop-relic-choices')!;
  private shopUpgrades = document.getElementById('shop-upgrades-grid')!;
  private btnReroll = document.getElementById('btn-reroll-relics') as HTMLButtonElement;
  private btnSkip = document.getElementById('btn-skip-relic') as HTMLButtonElement;

  private modalVictory = document.getElementById('modal-victory')!;
  private vicScore = document.getElementById('vic-total-score')!;
  private vicChain = document.getElementById('vic-max-chain')!;
  private vicSeed = document.getElementById('vic-seed')!;

  private modalGameOver = document.getElementById('modal-gameover')!;
  private goReason = document.getElementById('gameover-reason')!;
  private goSector = document.getElementById('go-sector')!;
  private goScore = document.getElementById('go-total-score')!;
  private goMines = document.getElementById('go-mines')!;
  private goChain = document.getElementById('go-max-chain')!;
  private goSeed = document.getElementById('go-seed')!;

  private callbacks: ModalCallbacks;
  private selectedChassis: ChassisId = 'demolisher';

  constructor(callbacks: ModalCallbacks, initialChassis: ChassisId) {
    this.callbacks = callbacks;
    this.selectedChassis = initialChassis;
    this.seedInput.value = generateReadableSeed();

    this.seedRandomBtn.addEventListener('click', () => {
      this.seedInput.value = generateReadableSeed();
    });

    document.getElementById('btn-start-game')!.addEventListener('click', () => {
      this.modalStart.classList.add('hidden');
      this.callbacks.onStartGame(this.seedInput.value);
    });

    document.getElementById('btn-start-tutorial')!.addEventListener('click', () => {
      this.modalStart.classList.add('hidden');
      this.callbacks.onStartTutorial();
    });

    document.getElementById('btn-close-help')!.addEventListener('click', () => {
      this.modalHelp.classList.add('hidden');
    });

    document.getElementById('btn-replay-tutorial')!.addEventListener('click', () => {
      this.modalHelp.classList.add('hidden');
      this.callbacks.onStartTutorial();
    });

    this.btnReroll.addEventListener('click', () => this.callbacks.onRerollRelics());
    this.btnSkip.addEventListener('click', () => this.callbacks.onSkipRelic());

    document.getElementById('btn-next-sector')!.addEventListener('click', () => {
      this.modalShop.classList.add('hidden');
      this.callbacks.onNextSector();
    });

    document.getElementById('btn-endless')!.addEventListener('click', () => {
      this.modalVictory.classList.add('hidden');
      this.callbacks.onContinueEndless();
    });

    document.getElementById('btn-vic-restart')!.addEventListener('click', () => {
      this.modalVictory.classList.add('hidden');
      this.showStartModal();
    });

    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.modalGameOver.classList.add('hidden');
      this.showStartModal();
    });

    this.renderChassisCards();
  }

  isAnyModalOpen(): boolean {
    return (
      !this.modalStart.classList.contains('hidden') ||
      !this.modalShop.classList.contains('hidden') ||
      !this.modalVictory.classList.contains('hidden') ||
      !this.modalGameOver.classList.contains('hidden') ||
      !this.modalHelp.classList.contains('hidden')
    );
  }

  updateRecord(rec: RunRecord): void {
    if (rec.bestScore > 0) {
      this.startBestBox.classList.remove('hidden');
      this.startBestVal.textContent = `S${rec.bestSector} · ${rec.bestScore} PT`;
    }
  }

  showStartModal(): void {
    this.seedInput.value = generateReadableSeed();
    this.renderChassisCards();
    this.modalStart.classList.remove('hidden');
  }

  openHelp(): void {
    this.modalHelp.classList.remove('hidden');
  }

  private renderChassisCards(): void {
    this.chassisGrid.innerHTML = '';
    for (const ch of CHASSIS_LIST) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chassis-card${ch.id === this.selectedChassis ? ' selected' : ''}`;
      btn.innerHTML = `
        <span class="chassis-code">${ch.code}</span>
        <span class="chassis-name">${ch.name}</span>
        <span class="chassis-role">${ch.role}</span>
        <div class="chassis-passive">
          <strong>${ch.passiveTitle}</strong>
          ${ch.passiveDesc}
        </div>
      `;
      btn.addEventListener('click', () => {
        this.selectedChassis = ch.id;
        this.callbacks.onSelectChassis(ch.id);
        this.renderChassisCards();
      });
      this.chassisGrid.appendChild(btn);
    }
  }

  renderShop(snap: GameSnapshot): void {
    this.modalShop.classList.remove('hidden');
    this.shopCredits.textContent = String(snap.credits);
    this.shopShields.textContent = `${snap.shields}/${snap.maxShields}`;

    if (snap.shopSummary) {
      this.shopSummary.innerHTML = `
        <span>Settore ${snap.sector}: <strong>+${snap.shopSummary.baseReward} ₡</strong></span>
        <span>Mosse (${snap.moves}): <strong>+${snap.shopSummary.moveBonus} ₡</strong></span>
        <span>Overkill: <strong>+${snap.shopSummary.overkillBonus} ₡</strong></span>
        <span>Totale: <strong>+${snap.shopSummary.totalEarned} ₡</strong></span>
      `;
    }

    const rerollCost = getRerollCost(snap.shopRerollsUsed);
    this.btnReroll.textContent = `↻ Reroll (${rerollCost} ₡)`;
    this.btnReroll.classList.toggle('hidden', snap.relicDraftTaken);
    this.btnReroll.disabled = snap.relicDraftTaken || snap.credits < rerollCost;
    this.btnSkip.classList.toggle('hidden', snap.relicDraftTaken);

    // Relic Draft Cards
    this.shopRelics.innerHTML = '';
    if (snap.shopRelicChoices.length === 0) {
      this.shopRelics.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;font-size:12px;color:var(--ink-muted);padding:12px;">Hai già installato tutte le Reliquie disponibili!</div>';
    } else {
      for (const id of snap.shopRelicChoices) {
        const rel = RELIC_BY_ID[id];
        const picked = snap.relics.includes(id);
        const card = document.createElement('button');
        card.type = 'button';
        card.disabled = snap.relicDraftTaken;
        card.className = `shop-relic-card${picked ? ' picked' : snap.relicDraftTaken ? ' dimmed' : ''}`;
        card.innerHTML = `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <span class="mono" style="font-size:10px;font-weight:700;color:var(--accent-brass);">${rel.tag}</span>
              <span class="mono" style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--ink-secondary);">${rel.rarity}</span>
            </div>
            <div class="display" style="font-size:16px;font-weight:700;color:var(--ink-primary);">${rel.name}</div>
            <p style="font-size:11.5px;color:var(--ink-secondary);margin:5px 0 0;line-height:1.38;">${rel.desc}</p>
          </div>
          <div class="mono" style="font-size:10px;font-weight:700;color:${picked ? 'var(--accent-emerald)' : 'var(--accent-gold)'};padding-top:6px;border-top:1px solid var(--line-subtle);">
            ${picked ? '✓ INSTALLATA' : 'INSTALLA GRATIS →'}
          </div>
        `;
        card.addEventListener('click', () => this.callbacks.onDraftRelic(id));
        this.shopRelics.appendChild(card);
      }
    }

    // Escalating Supply Bay Upgrades
    this.shopUpgrades.innerHTML = '';
    for (const def of SHOP_UPGRADES) {
      const bought = snap.upgradeCounts[def.id];
      const cost = getUpgradeCost(def, bought);
      const maxed =
        (def.maxPurchases !== undefined && bought >= def.maxPurchases) ||
        (def.id === 'repair_shield' && snap.shields >= snap.maxShields) ||
        (def.id === 'max_shield' && snap.maxShields >= 6);
      const canBuy = !maxed && snap.credits >= cost;

      const sub = this.getUpgradeSubtitle(def.id, snap);
      const iconSvg =
        def.iconKey in MODULE_ICONS
          ? MODULE_ICONS[def.iconKey as keyof typeof MODULE_ICONS]
          : UI_ICONS[def.iconKey as keyof typeof UI_ICONS] ?? UI_ICONS.bolt;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = !canBuy;
      btn.className = 'shop-upgrade-btn';
      btn.innerHTML = `
        <div class="shop-upgrade-left">
          <span class="shop-upgrade-icon">${iconSvg}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--ink-primary);line-height:1.15;">${def.title}</div>
            <div class="mono" style="font-size:10px;color:var(--ink-muted);margin-top:2px;">${sub}</div>
          </div>
        </div>
        <span class="shop-price">${maxed ? 'MAX' : `${cost} ₡`}</span>
      `;
      btn.addEventListener('click', () => this.callbacks.onBuyUpgrade(def.id));
      this.shopUpgrades.appendChild(btn);
    }
  }

  private getUpgradeSubtitle(id: ShopUpgradeId, snap: GameSnapshot): string {
    switch (id) {
      case 'repair_shield':
        return `Scudi: ${snap.shields}/${snap.maxShields}`;
      case 'max_shield':
        return `Max attuale: ${snap.maxShields}/6`;
      case 'add_c4':
        return `Base: ×${snap.baseCharges.c4}/sett.`;
      case 'add_arc':
        return `Base: ×${snap.baseCharges.arc}/sett.`;
      case 'add_cross':
        return `Base: ×${snap.baseCharges.cross}/sett.`;
      case 'add_amp':
        return `Base: ×${snap.baseCharges.amp}/sett.`;
      case 'add_prism':
        return `Base: ×${snap.baseCharges.prism}/sett.`;
      case 'add_siphon':
        return `Base: ×${snap.baseCharges.siphon}/sett.`;
      case 'add_sonar':
        return `Base: ×${snap.baseCharges.sonar}/sett.`;
      case 'add_moves':
        return `Bonus attuale: +${snap.bonusMoves}`;
    }
  }

  showVictory(snap: GameSnapshot): void {
    this.vicScore.textContent = String(snap.totalScore);
    this.vicChain.textContent = String(snap.maxChain);
    this.vicSeed.textContent = snap.seed;
    this.modalVictory.classList.remove('hidden');
  }

  showGameOver(snap: GameSnapshot): void {
    this.goReason.textContent = snap.gameOverReason;
    this.goSector.textContent = String(snap.sector);
    this.goScore.textContent = String(snap.totalScore);
    this.goMines.textContent = String(snap.totalMinesDetonated);
    this.goChain.textContent = String(snap.maxChain);
    this.goSeed.textContent = snap.seed;
    this.modalGameOver.classList.remove('hidden');
  }
}
