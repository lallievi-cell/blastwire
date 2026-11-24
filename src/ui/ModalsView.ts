import gsap from 'gsap';
import { CHASSIS_LIST } from '../data/chassis';
import { getModuleStats, getModuleUpgradeCost, MODULES } from '../data/modules';
import { RELIC_BY_ID } from '../data/relics';
import { getRerollCost, getUpgradeCost, SHOP_UPGRADES } from '../data/shop';
import { generateReadableSeed } from '../engine/prng';
import type {
  ChassisId,
  GameSnapshot,
  RelicId,
  RunRecord,
  ShopUpgradeId,
  WireModuleId,
} from '../types/game';
import { MODULE_ICONS, UI_ICONS } from './icons';

export interface ModalCallbacks {
  onSelectChassis: (id: ChassisId) => void;
  onStartGame: (seed: string) => void;
  onStartTutorial: () => void;
  onDraftRelic: (id: RelicId) => void;
  onSkipRelic: () => void;
  onRerollRelics: () => void;
  onBuyModuleLevel: (id: WireModuleId) => void;
  onBuyUpgrade: (id: ShopUpgradeId) => void;
  onSelectRoute: (routeId: string) => void;
  onNextSector: () => void;
  onContinueEndless: () => void;
  onRestart: () => void;
  onCopySeed: (seed: string) => void;
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
  private shopLevelsSection = document.getElementById('shop-levels-section')!;
  private shopLevelsGrid = document.getElementById('shop-levels-grid')!;
  private shopUpgrades = document.getElementById('shop-upgrades-grid')!;
  private shopRoutesSection = document.getElementById('shop-routes-section')!;
  private shopRoutesGrid = document.getElementById('shop-routes-grid')!;
  private btnReroll = document.getElementById('btn-reroll-relics') as HTMLButtonElement;
  private btnSkip = document.getElementById('btn-skip-relic') as HTMLButtonElement;
  private btnNextSector = document.getElementById('btn-next-sector') as HTMLButtonElement;

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
  private lastSeedShown = '';

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

    this.btnNextSector.addEventListener('click', () => {
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

    document.getElementById('btn-copy-vic-seed')!.addEventListener('click', () => {
      this.callbacks.onCopySeed(this.lastSeedShown);
    });

    document.getElementById('btn-copy-go-seed')!.addEventListener('click', () => {
      this.callbacks.onCopySeed(this.lastSeedShown);
    });

    this.renderSpecialistCards();
    this.animateCardIn(this.modalStart.querySelector('.start-card')!);
  }

  private animateCardIn(el: Element | null): void {
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 16, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' },
    );
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
    this.renderSpecialistCards();
    this.modalStart.classList.remove('hidden');
    this.animateCardIn(this.modalStart.querySelector('.start-card'));
  }

  openHelp(): void {
    this.modalHelp.classList.remove('hidden');
    this.animateCardIn(this.modalHelp.querySelector('.modal-card'));
  }

  private renderSpecialistCards(): void {
    this.chassisGrid.innerHTML = '';
    for (const sp of CHASSIS_LIST) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.accent = sp.accent;
      btn.className = `specialist-card${sp.id === this.selectedChassis ? ' selected' : ''}`;
      btn.innerHTML = `
        <img class="sp-portrait" src="${sp.portrait}" alt="${sp.name}" />
        <div class="sp-info">
          <div class="sp-head">
            <span class="sp-name">${sp.name}</span>
            <span class="sp-role">${sp.code}</span>
          </div>
          <p class="sp-desc">${sp.passiveDesc}</p>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.selectedChassis = sp.id;
        this.callbacks.onSelectChassis(sp.id);
        this.renderSpecialistCards();
      });
      this.chassisGrid.appendChild(btn);
    }
  }

  renderShop(snap: GameSnapshot, animate = false): void {
    const wasHidden = this.modalShop.classList.contains('hidden');
    this.modalShop.classList.remove('hidden');
    if (wasHidden || animate) {
      this.animateCardIn(this.modalShop.querySelector('.modal-card'));
    }

    this.shopCredits.textContent = String(snap.credits);
    this.shopShields.textContent = `${snap.shields}/${snap.maxShields}`;

    if (snap.shopSummary) {
      const contractPart =
        snap.shopSummary.contractBonus > 0
          ? `<span>Contratto: <strong>+${snap.shopSummary.contractBonus} ₡</strong></span>`
          : '';
      this.shopSummary.innerHTML = `
        <span>Settore ${snap.sector}: <strong>+${snap.shopSummary.baseReward} ₡</strong></span>
        <span>Mosse (${snap.moves}): <strong>+${snap.shopSummary.moveBonus} ₡</strong></span>
        <span>Overkill: <strong>+${snap.shopSummary.overkillBonus} ₡</strong></span>
        ${contractPart}
        <span>Totale: <strong>+${snap.shopSummary.totalEarned} ₡</strong></span>
      `;
    }

    const rerollCost = getRerollCost(snap.shopRerollsUsed);
    this.btnReroll.textContent = `↻ Cambia (${rerollCost} ₡)`;
    this.btnReroll.classList.toggle('hidden', snap.relicDraftTaken);
    this.btnReroll.disabled = snap.relicDraftTaken || snap.credits < rerollCost;
    this.btnSkip.classList.toggle('hidden', snap.relicDraftTaken);

    // 1. Balanced Relic Draft
    this.shopRelics.innerHTML = '';
    if (snap.shopRelicChoices.length === 0) {
      this.shopRelics.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;font-size:12px;color:var(--ink-muted);padding:12px;">Hai già preso tutti i potenziamenti!</div>';
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
              <span class="mono" style="font-size:10px;font-weight:700;color:var(--accent-gold);">${rel.tag}</span>
              <span class="mono" style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--ink-secondary);">${rel.rarity}</span>
            </div>
            <div class="display" style="font-size:16px;font-weight:800;color:var(--ink-primary);">${rel.name}</div>
            <p style="font-size:12px;color:var(--ink-secondary);margin:5px 0 0;line-height:1.36;">${rel.desc}</p>
          </div>
          <div class="mono" style="font-size:10px;font-weight:700;color:${picked ? 'var(--accent-emerald)' : 'var(--accent-gold)'};padding-top:6px;border-top:1px solid var(--line-subtle);">
            ${picked ? '✓ ATTIVATO' : 'SCEGLI GRATIS →'}
          </div>
        `;
        card.addEventListener('click', () => this.callbacks.onDraftRelic(id));
        this.shopRelics.appendChild(card);
      }
      if (wasHidden) {
        gsap.from(this.shopRelics.children, {
          opacity: 0,
          y: 12,
          stagger: 0.06,
          duration: 0.28,
          ease: 'power2.out',
        });
      }
    }

    // 2. Module Lv.1 -> Lv.3 Upgrade Bay (Balatro Planet-style)
    this.shopLevelsSection.classList.toggle('hidden', snap.shopLevelOffers.length === 0);
    this.shopLevelsGrid.innerHTML = '';
    for (const id of snap.shopLevelOffers) {
      const def = MODULES[id];
      const alreadyBought = snap.shopLevelBought.includes(id);
      const curLv = snap.moduleLevels[id];
      const cost = getModuleUpgradeCost(alreadyBought ? curLv - 1 : curLv);
      const canBuy = !alreadyBought && curLv < 3 && snap.credits >= cost;
      const stats = getModuleStats(id, alreadyBought ? curLv - 1 : curLv);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = !canBuy;
      btn.className = `shop-level-card${alreadyBought ? ' bought' : ''}`;
      btn.innerHTML = `
        <div class="shop-upgrade-left">
          <span class="shop-upgrade-icon" style="color:var(--accent-amber);">${MODULE_ICONS[id]}</span>
          <div>
            <div style="font-size:13px;font-weight:800;color:var(--ink-primary);">
              ${def.name} <span class="mono" style="color:var(--accent-gold);">${
                alreadyBought ? `Lv.${curLv} ✓` : `Lv.${curLv} → Lv.${curLv + 1}`
              }</span>
            </div>
            <div style="font-size:11px;color:var(--ink-secondary);margin-top:2px;">${stats.nextUpgradeSummary}</div>
          </div>
        </div>
        <span class="shop-price" style="background:rgba(255,156,42,0.16);border-color:rgba(255,156,42,0.45);color:var(--accent-gold);">${
          alreadyBought ? 'FATTO' : `${cost} ₡`
        }</span>
      `;
      btn.addEventListener('click', () => this.callbacks.onBuyModuleLevel(id));
      this.shopLevelsGrid.appendChild(btn);
    }

    // 3. Escalating Supply Bay
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
            <div style="font-size:12.5px;font-weight:700;color:var(--ink-primary);line-height:1.15;">${def.title}</div>
            <div class="mono" style="font-size:10px;color:var(--ink-muted);margin-top:2px;">${sub}</div>
          </div>
        </div>
        <span class="shop-price">${maxed ? 'MAX' : `${cost} ₡`}</span>
      `;
      btn.addEventListener('click', () => this.callbacks.onBuyUpgrade(def.id));
      this.shopUpgrades.appendChild(btn);
    }

    // 4. Sector Route Fork (2 Contracts!)
    const hasRoutes = snap.shopRouteChoices.length > 0;
    this.shopRoutesSection.classList.toggle('hidden', !hasRoutes);
    this.shopRoutesGrid.innerHTML = '';
    for (const route of snap.shopRouteChoices) {
      const selected = route.id === snap.selectedRouteId;
      const card = document.createElement('button');
      card.type = 'button';
      card.dataset.accent = route.accent;
      card.className = `route-card${selected ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="route-head">
          <span class="route-title">${route.title}</span>
          <span class="route-layout">${route.layoutLabel}</span>
        </div>
        <div class="route-perk">✓ ${route.perkLabel}</div>
        <div class="route-risk">▲ ${route.riskLabel}</div>
      `;
      card.addEventListener('click', () => this.callbacks.onSelectRoute(route.id));
      this.shopRoutesGrid.appendChild(card);
    }

    const nextSec = snap.sector + 1;
    this.btnNextSector.textContent =
      nextSec === 6
        ? 'AFFRONTA IL BOSS FINALE (S6) →'
        : `SCENDI NEL SETTORE ${nextSec} →`;
  }

  private getUpgradeSubtitle(id: ShopUpgradeId, snap: GameSnapshot): string {
    switch (id) {
      case 'repair_shield':
        return `Scudi: ${snap.shields}/${snap.maxShields}`;
      case 'max_shield':
        return `Massimo: ${snap.maxShields}/6`;
      case 'add_c4':
        return `Ora hai: ×${snap.baseCharges.c4}`;
      case 'add_arc':
        return `Ora hai: ×${snap.baseCharges.arc}`;
      case 'add_cross':
        return `Ora hai: ×${snap.baseCharges.cross}`;
      case 'add_amp':
        return `Ora hai: ×${snap.baseCharges.amp}`;
      case 'add_prism':
        return `Ora hai: ×${snap.baseCharges.prism}`;
      case 'add_siphon':
        return `Ora hai: ×${snap.baseCharges.siphon}`;
      case 'add_sonar':
        return `Ora hai: ×${snap.baseCharges.sonar}`;
      case 'add_moves':
        return `Extra: +${snap.bonusMoves}`;
    }
  }

  showVictory(snap: GameSnapshot): void {
    this.lastSeedShown = snap.seed;
    this.vicScore.textContent = String(snap.totalScore);
    this.vicChain.textContent = String(snap.maxChain);
    this.vicSeed.textContent = snap.seed;
    this.modalVictory.classList.remove('hidden');
    this.animateCardIn(this.modalVictory.querySelector('.modal-card'));
  }

  showGameOver(snap: GameSnapshot): void {
    this.lastSeedShown = snap.seed;
    this.goReason.textContent = snap.gameOverReason;
    this.goSector.textContent = String(snap.sector);
    this.goScore.textContent = String(snap.totalScore);
    this.goMines.textContent = String(snap.totalMinesDetonated);
    this.goChain.textContent = String(snap.maxChain);
    this.goSeed.textContent = snap.seed;
    this.modalGameOver.classList.remove('hidden');
    this.animateCardIn(this.modalGameOver.querySelector('.modal-card'));
  }
}
