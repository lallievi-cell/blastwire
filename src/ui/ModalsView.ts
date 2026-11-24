import gsap from 'gsap';
import { CHASSIS_LIST } from '../data/chassis';
import { getModuleStats, getModuleUpgradeCost, MODULES } from '../data/modules';
import { RELIC_BY_ID } from '../data/relics';
import { getRerollCost, getUpgradeCost, SHOP_UPGRADES } from '../data/shop';
import {
  getActiveSectorSpecialTiles,
  TILE_GUIDE_ENTRIES,
  type TileGuideEntry,
  type TileGuideId,
} from '../data/tileGuide';
import { generateReadableSeed } from '../engine/prng';
import type {
  ChassisId,
  GameSnapshot,
  RelicId,
  RunRecord,
  ShopUpgradeId,
  WireModuleId,
} from '../types/game';
import {
  MODULE_ICONS,
  RELIC_ICONS,
  renderLayoutBlueprintSvg,
  UI_ICONS,
} from './icons';

export interface ModalCallbacks {
  onSelectChassis: (id: ChassisId) => void;
  onStartGame: (seed: string) => void;
  onStartTutorial: () => void;
  onOpenTileGuideFromHelp: () => void;
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

type ArmoryTab = 'potenzia' | 'scorta' | 'percorso';

const SUPPLY_ACCENT: Record<ShopUpgradeId, string> = {
  repair_shield: 'emerald',
  max_shield: 'emerald',
  add_c4: 'amber',
  add_arc: 'cyan',
  add_cross: 'ember',
  add_amp: 'gold',
  add_prism: 'ice',
  add_siphon: 'emerald',
  add_sonar: 'cyan',
  add_moves: 'amber',
};

export class ModalsView {
  private modalStart = document.getElementById('modal-start')!;
  private startBestBox = document.getElementById('start-best-box')!;
  private startBestVal = document.getElementById('start-best-val')!;
  private chassisGrid = document.getElementById('start-chassis-grid')!;
  private seedInput = document.getElementById('start-seed-input') as HTMLInputElement;
  private seedRandomBtn = document.getElementById('btn-random-seed')!;

  private modalHelp = document.getElementById('modal-help')!;
  private modalTiles = document.getElementById('modal-tiles')!;
  private tileGuideActiveWrap = document.getElementById('tile-guide-active-wrap')!;
  private tileGuideActiveList = document.getElementById('tile-guide-active-list')!;
  private tileGuideBaseList = document.getElementById('tile-guide-base-list')!;
  private tileGuideSpecialList = document.getElementById('tile-guide-special-list')!;

  private modalShop = document.getElementById('modal-shop')!;
  private shopClearedBadge = document.getElementById('shop-cleared-badge')!;
  private shopCredits = document.getElementById('shop-credits')!;
  private shopShields = document.getElementById('shop-shields')!;
  private shopSummary = document.getElementById('shop-bonus-summary')!;
  private shopRelics = document.getElementById('shop-relic-choices')!;
  private shopLevelsSection = document.getElementById('shop-levels-section')!;
  private shopLevelsGrid = document.getElementById('shop-levels-grid')!;
  private shopUpgrades = document.getElementById('shop-upgrades-grid')!;
  private shopRoutesSection = document.getElementById('shop-routes-section')!;
  private shopRoutesGrid = document.getElementById('shop-routes-grid')!;
  private shopBossBriefing = document.getElementById('shop-boss-briefing')!;
  private btnReroll = document.getElementById('btn-reroll-relics') as HTMLButtonElement;
  private btnSkip = document.getElementById('btn-skip-relic') as HTMLButtonElement;
  private btnNextSector = document.getElementById('btn-next-sector') as HTMLButtonElement;
  private armoryFooterHint = document.getElementById('armory-footer-hint')!;

  private tabButtons: Record<ArmoryTab, HTMLButtonElement> = {
    potenzia: document.getElementById('tab-btn-potenzia') as HTMLButtonElement,
    scorta: document.getElementById('tab-btn-scorta') as HTMLButtonElement,
    percorso: document.getElementById('tab-btn-percorso') as HTMLButtonElement,
  };
  private tabPanes: Record<ArmoryTab, HTMLElement> = {
    potenzia: document.getElementById('armory-pane-potenzia')!,
    scorta: document.getElementById('armory-pane-scorta')!,
    percorso: document.getElementById('armory-pane-percorso')!,
  };
  private tabPipRelic = document.getElementById('tab-pip-relic')!;
  private tabPipScorta = document.getElementById('tab-pip-scorta')!;
  private tabPipRoute = document.getElementById('tab-pip-route')!;

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
  private activeArmoryTab: ArmoryTab = 'potenzia';
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

    document.getElementById('btn-help-open-tiles')!.addEventListener('click', () => {
      this.modalHelp.classList.add('hidden');
      this.callbacks.onOpenTileGuideFromHelp();
    });

    const closeTiles = () => this.modalTiles.classList.add('hidden');
    document.getElementById('btn-close-tiles')!.addEventListener('click', closeTiles);
    document.getElementById('btn-close-tiles-bottom')!.addEventListener('click', closeTiles);
    this.modalTiles.addEventListener('click', (e) => {
      if (e.target === this.modalTiles) closeTiles();
    });

    document.getElementById('btn-replay-tutorial')!.addEventListener('click', () => {
      this.modalHelp.classList.add('hidden');
      this.callbacks.onStartTutorial();
    });

    for (const tab of ['potenzia', 'scorta', 'percorso'] as ArmoryTab[]) {
      this.tabButtons[tab].addEventListener('click', () => this.setArmoryTab(tab));
    }

    this.armoryFooterHint.addEventListener('click', () => {
      this.setArmoryTab('potenzia');
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

  private setArmoryTab(tab: ArmoryTab, animate = true): void {
    const changed = this.activeArmoryTab !== tab;
    this.activeArmoryTab = tab;
    for (const key of ['potenzia', 'scorta', 'percorso'] as ArmoryTab[]) {
      const isActive = key === tab;
      this.tabButtons[key].classList.toggle('active', isActive);
      this.tabButtons[key].setAttribute('aria-selected', String(isActive));
      this.tabPanes[key].classList.toggle('hidden', !isActive);
    }
    const body = this.modalShop.querySelector('.armory-body');
    if (body) body.scrollTop = 0;
    if (animate && changed) {
      gsap.fromTo(
        this.tabPanes[tab],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
      );
    }
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
      !this.modalHelp.classList.contains('hidden') ||
      !this.modalTiles.classList.contains('hidden')
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

  openTileGuide(snap: GameSnapshot, focusId?: TileGuideId): void {
    const activeSet = new Set<TileGuideId>(getActiveSectorSpecialTiles(snap));

    const buildItem = (entry: TileGuideEntry, isPresentHere: boolean) => {
      const card = document.createElement('div');
      card.className = `tile-guide-item${focusId === entry.id ? ' focused' : ''}`;
      card.dataset.accent = entry.accent;
      card.dataset.guideId = entry.id;
      const presentTag = isPresentHere
        ? `<span class="tg-present-pill">QUI</span>`
        : '';
      card.innerHTML = `
        <div class="${entry.previewClasses}" aria-hidden="true">${entry.previewInnerHtml}</div>
        <div class="tile-guide-info">
          <div class="tile-guide-head">
            <span class="tile-guide-name">${entry.name}</span>
            <div class="tile-guide-badges">
              ${presentTag}
              <span class="tile-guide-role">${entry.badge}</span>
            </div>
          </div>
          <p class="tile-guide-desc">${entry.desc}</p>
        </div>
      `;
      return card;
    };

    this.tileGuideActiveList.innerHTML = '';
    this.tileGuideBaseList.innerHTML = '';
    this.tileGuideSpecialList.innerHTML = '';

    const activeEntries = TILE_GUIDE_ENTRIES.filter((e) => activeSet.has(e.id));
    this.tileGuideActiveWrap.classList.toggle('hidden', activeEntries.length === 0);
    for (const e of activeEntries) {
      this.tileGuideActiveList.appendChild(buildItem(e, true));
    }

    for (const e of TILE_GUIDE_ENTRIES.filter((x) => x.category === 'base')) {
      this.tileGuideBaseList.appendChild(buildItem(e, false));
    }

    const otherSpecials = TILE_GUIDE_ENTRIES.filter(
      (x) => x.category === 'special' && !activeSet.has(x.id),
    );
    const specialSection = this.tileGuideSpecialList.parentElement!;
    specialSection.classList.toggle('hidden', otherSpecials.length === 0);
    for (const e of otherSpecials) {
      this.tileGuideSpecialList.appendChild(buildItem(e, false));
    }

    this.modalTiles.classList.remove('hidden');
    this.animateCardIn(this.modalTiles.querySelector('.tile-guide-card'));

    const body = document.getElementById('tile-guide-body');
    if (body) body.scrollTop = 0;
    if (focusId) {
      requestAnimationFrame(() => {
        const target = this.modalTiles.querySelector(
          `[data-guide-id="${focusId}"]`,
        ) as HTMLElement | null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
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
    if (wasHidden) {
      this.setArmoryTab('potenzia');
    }
    if (wasHidden || animate) {
      this.animateCardIn(this.modalShop.querySelector('.armory-card'));
    }

    this.shopClearedBadge.textContent = `✓ SETTORE ${snap.sector} COMPLETATO`;
    this.shopCredits.textContent = String(snap.credits);
    this.shopShields.textContent = `${snap.shields}/${snap.maxShields}`;

    // Compact Reward Breakdown Ribbon over the Armory Banner
    if (snap.shopSummary) {
      const chips: string[] = [
        `<span class="reward-chip">Settore <strong>+${snap.shopSummary.baseReward}</strong></span>`,
        `<span class="reward-chip">Mosse <strong>+${snap.shopSummary.moveBonus}</strong></span>`,
      ];
      if (snap.shopSummary.overkillBonus > 0) {
        chips.push(
          `<span class="reward-chip">Extra <strong>+${snap.shopSummary.overkillBonus}</strong></span>`,
        );
      }
      if (snap.shopSummary.contractBonus > 0) {
        chips.push(
          `<span class="reward-chip">Contratto <strong>+${snap.shopSummary.contractBonus}</strong></span>`,
        );
      }
      chips.push(
        `<span class="reward-chip total">+${snap.shopSummary.totalEarned} ₡</span>`,
      );
      this.shopSummary.innerHTML = chips.join('');
    }

    // Tab Pip Badges
    const hasFreeRelic = !snap.relicDraftTaken && snap.shopRelicChoices.length > 0;
    this.tabPipRelic.textContent = hasFreeRelic ? 'GRATIS' : '✓ OK';
    this.tabPipRelic.className = `armory-tab-pip ${hasFreeRelic ? 'gold pulse' : 'emerald'}`;
    this.tabPipScorta.textContent = `${snap.credits} ₡`;

    const nextSec = snap.sector + 1;
    const selectedRoute = snap.shopRouteChoices.find((r) => r.id === snap.selectedRouteId);
    if (nextSec === 6) {
      this.tabPipRoute.textContent = 'BOSS S6';
      this.tabPipRoute.className = 'armory-tab-pip ember';
    } else {
      this.tabPipRoute.textContent = selectedRoute ? selectedRoute.layoutLabel.split(' ')[0].toUpperCase() : 'MAPPA';
      this.tabPipRoute.className = 'armory-tab-pip emerald';
    }

    const rerollCost = getRerollCost(snap.shopRerollsUsed);
    this.btnReroll.textContent = `↻ Cambia (${rerollCost} ₡)`;
    this.btnReroll.classList.toggle('hidden', snap.relicDraftTaken);
    this.btnReroll.disabled = snap.relicDraftTaken || snap.credits < rerollCost;
    this.btnSkip.classList.toggle('hidden', snap.relicDraftTaken);

    // 1. Collectible Foil Relic Draft Cards
    this.shopRelics.innerHTML = '';
    if (snap.shopRelicChoices.length === 0) {
      this.shopRelics.innerHTML =
        '<div class="armory-empty">Hai già raccolto tutte le Reliquie disponibili!</div>';
    } else {
      for (const id of snap.shopRelicChoices) {
        const rel = RELIC_BY_ID[id];
        const picked = snap.relics.includes(id);
        const rarityKey = rel.rarity.toLowerCase(); // comune | raro | epico
        const card = document.createElement('button');
        card.type = 'button';
        card.disabled = snap.relicDraftTaken;
        card.dataset.rarity = rarityKey;
        card.dataset.accent = rel.accent;
        card.className = `shop-relic-card${picked ? ' picked' : snap.relicDraftTaken ? ' dimmed' : ''}`;
        card.innerHTML = `
          <div class="relic-foil-sheen" aria-hidden="true"></div>
          <div class="relic-card-top">
            <div class="relic-emblem">${RELIC_ICONS[id]}</div>
            <div class="relic-meta">
              <div class="relic-badges-row">
                <span class="relic-rarity-badge ${rarityKey}">${rel.rarity}</span>
                <span class="relic-tag-badge">${rel.tag}</span>
              </div>
              <div class="relic-name">${rel.name}</div>
            </div>
          </div>
          <p class="relic-desc">${rel.desc}</p>
          <div class="relic-card-cta">
            ${picked ? '✓ ATTIVATA' : 'SCEGLI GRATIS →'}
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

    // 2. Module Lv.1 -> Lv.3 Forge Bay
    this.shopLevelsSection.classList.toggle('hidden', snap.shopLevelOffers.length === 0);
    this.shopLevelsGrid.innerHTML = '';
    for (const id of snap.shopLevelOffers) {
      const def = MODULES[id];
      const alreadyBought = snap.shopLevelBought.includes(id);
      const curLv = snap.moduleLevels[id];
      const displayFromLv = alreadyBought ? curLv - 1 : curLv;
      const cost = getModuleUpgradeCost(displayFromLv);
      const canBuy = !alreadyBought && curLv < 3 && snap.credits >= cost;
      const stats = getModuleStats(id, displayFromLv);

      const pips = [1, 2, 3]
        .map((n) => {
          const filled = n <= curLv;
          const next = !alreadyBought && n === curLv + 1;
          return `<span class="lv-pip${filled ? ' on' : next ? ' next' : ''}"></span>`;
        })
        .join('');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = !canBuy;
      btn.className = `shop-level-card${alreadyBought ? ' bought' : ''}`;
      btn.innerHTML = `
        <div class="shop-upgrade-left">
          <span class="forge-icon" data-accent="${def.accent}">${MODULE_ICONS[id]}</span>
          <div class="forge-info">
            <div class="forge-title-row">
              <span class="forge-name">${def.name}</span>
              <span class="forge-lv-tag">${
                alreadyBought ? `Lv.${curLv} ✓` : `Lv.${curLv} → Lv.${curLv + 1}`
              }</span>
            </div>
            <div class="lv-pips-row">${pips}</div>
            <div class="forge-desc">${stats.nextUpgradeSummary}</div>
          </div>
        </div>
        <span class="forge-price">${alreadyBought ? 'FATTO' : `${cost} ₡`}</span>
      `;
      btn.addEventListener('click', () => this.callbacks.onBuyModuleLevel(id));
      this.shopLevelsGrid.appendChild(btn);
    }

    // 3. Compact 2-Column Supply Bay
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
      btn.dataset.accent = SUPPLY_ACCENT[def.id];
      btn.className = `shop-upgrade-btn${maxed ? ' maxed' : ''}`;
      btn.innerHTML = `
        <div class="shop-upgrade-left">
          <span class="shop-upgrade-icon">${iconSvg}</span>
          <div class="shop-upgrade-text">
            <div class="shop-upgrade-title">${def.title}</div>
            <div class="shop-upgrade-sub">${sub}</div>
          </div>
        </div>
        <span class="shop-price">${maxed ? 'MAX' : `${cost} ₡`}</span>
      `;
      btn.addEventListener('click', () => this.callbacks.onBuyUpgrade(def.id));
      this.shopUpgrades.appendChild(btn);
    }

    // 4. Sector Route Contracts with Live Blueprint Mini-Maps (or Boss S6 Briefing)
    const hasRoutes = snap.shopRouteChoices.length > 0;
    this.shopRoutesSection.classList.toggle('hidden', !hasRoutes);
    this.shopBossBriefing.classList.toggle('hidden', hasRoutes);

    if (hasRoutes) {
      this.shopRoutesGrid.innerHTML = '';
      for (const route of snap.shopRouteChoices) {
        const selected = route.id === snap.selectedRouteId;
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.accent = route.accent;
        card.className = `route-card${selected ? ' selected' : ''}`;
        card.innerHTML = `
          <div class="route-blueprint-wrap">
            ${renderLayoutBlueprintSvg(route.layout)}
          </div>
          <div class="route-details">
            <div class="route-head">
              <span class="route-title">${route.title}</span>
              <span class="route-selected-tag">${selected ? '✓ SCELTO' : 'SCEGLI'}</span>
            </div>
            <div class="route-layout-sub">${route.layoutLabel}</div>
            <div class="route-pills">
              <span class="route-perk">✓ ${route.perkLabel}</span>
              <span class="route-risk">▲ ${route.riskLabel}</span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => this.callbacks.onSelectRoute(route.id));
        this.shopRoutesGrid.appendChild(card);
      }
    } else {
      this.shopBossBriefing.innerHTML = `
        <div class="route-blueprint-wrap boss">
          ${renderLayoutBlueprintSvg('reactor')}
        </div>
        <div class="boss-briefing-text">
          <span class="boss-briefing-kicker">BOSS FINALE · SETTORE 6</span>
          <h3>CUORE DEL REATTORE</h3>
          <p>Il <strong>Nucleo Omega</strong> al centro ha 2 fasi: rompi il suo scudo (o centra una combo da 4+ mine) e fallo saltare in aria!</p>
        </div>
      `;
    }

    // Footer launch hint & CTA
    this.armoryFooterHint.classList.toggle('hidden', !hasFreeRelic);
    this.btnNextSector.textContent =
      nextSec === 6
        ? 'AFFRONTA IL BOSS FINALE (S6) →'
        : `SCENDI NEL SETTORE ${nextSec} →`;
  }

  private getUpgradeSubtitle(id: ShopUpgradeId, snap: GameSnapshot): string {
    switch (id) {
      case 'repair_shield':
        return `${snap.shields}/${snap.maxShields} scudi`;
      case 'max_shield':
        return `Max ${snap.maxShields}/6`;
      case 'add_c4':
        return `Hai ×${snap.baseCharges.c4}`;
      case 'add_arc':
        return `Hai ×${snap.baseCharges.arc}`;
      case 'add_cross':
        return `Hai ×${snap.baseCharges.cross}`;
      case 'add_amp':
        return `Hai ×${snap.baseCharges.amp}`;
      case 'add_prism':
        return `Hai ×${snap.baseCharges.prism}`;
      case 'add_siphon':
        return `Hai ×${snap.baseCharges.siphon}`;
      case 'add_sonar':
        return `Hai ×${snap.baseCharges.sonar}`;
      case 'add_moves':
        return `Extra +${snap.bonusMoves}`;
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

