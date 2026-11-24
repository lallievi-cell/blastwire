import { CHASSIS_BY_ID } from '../data/chassis';
import { MODULES, WIRE_MODULE_IDS } from '../data/modules';
import { RELIC_CATALOG } from '../data/relics';
import { getSectorConfig } from '../data/sectors';
import {
  createInitialUpgradeCounts,
  getRerollCost,
  getUpgradeCost,
  SHOP_UPGRADES,
} from '../data/shop';
import {
  createTutorialBoard,
  TUTORIAL_SECTOR_CONFIG,
  TUTORIAL_STEPS,
} from '../tutorial/scenarios';
import type {
  Cell,
  ChargeBag,
  ChassisId,
  DetonationResolution,
  GameSnapshot,
  RelicId,
  SalvoBreakdown,
  ShopSummary,
  ShopUpgradeId,
  ToolId,
  WireModuleId,
} from '../types/game';
import {
  applyBastionArmor,
  createEmptyBoard,
  populateMinesAndAnomalies,
} from './BoardGenerator';
import {
  computeArcNetwork,
  estimateSalvo,
  resolveDetonation,
  type ArcNetwork,
  type DetonationContext,
} from './DetonationResolver';
import {
  countLiveMines,
  floodReveal,
  getNeighbors,
  getWiredCells,
  recalculateCounts,
  scanSonarArea,
} from './MinesweeperLogic';
import { generateReadableSeed, normalizeSeed, SeededRng } from './prng';

export interface ActionFeedback {
  ok: boolean;
  toast?: string;
  toastTone?: 'neutral' | 'info' | 'warn' | 'danger' | 'success';
  sfx?:
    | 'reveal'
    | 'reveal_big'
    | 'wire'
    | 'unwire'
    | 'pin'
    | 'sonar'
    | 'dud'
    | 'crystal'
    | 'buy'
    | 'win'
    | 'fail'
    | 'armor';
  sfxParam?: string;
  crystals?: { r: number; c: number; credits: number }[];
  popups?: { r: number; c: number; text: string; color: string; big?: boolean }[];
  bastionArmored?: { r: number; c: number }[];
  hitMine?: { r: number; c: number; autoWired?: boolean };
  sonarHit?: { r: number; c: number; targetR?: number; targetC?: number };
  triggeredRelic?: { id: RelicId; label: string };
}

export class GameEngine {
  private rng: SeededRng;
  private state: GameSnapshot;
  private wireOrderCounter = 0;
  private autoWireUsedThisSector = false;

  constructor(seed?: string, chassisId: ChassisId = 'demolisher') {
    const cleanSeed = seed ? normalizeSeed(seed) : generateReadableSeed();
    this.rng = new SeededRng(cleanSeed);
    this.state = this.buildInitialRunState(cleanSeed, chassisId);
  }

  private buildInitialRunState(seed: string, chassisId: ChassisId): GameSnapshot {
    const chassis = CHASSIS_BY_ID[chassisId];
    const cfg = getSectorConfig(1);
    const baseCharges: ChargeBag = { ...chassis.startingCharges };
    const relics: RelicId[] = [...chassis.startingRelics];

    const state: GameSnapshot = {
      seed,
      chassisId,
      sector: 1,
      config: cfg,
      shields: chassis.maxShields,
      maxShields: chassis.maxShields,
      credits: 0,
      relics,
      baseCharges,
      charges: { ...baseCharges },
      bonusMoves: chassis.bonusMoves,
      moves: cfg.moves + chassis.bonusMoves,
      movesSinceBastion: 0,
      sectorScore: 0,
      sectorTarget: cfg.target,
      totalScore: 0,
      totalMinesDetonated: 0,
      maxChain: 0,
      board: createEmptyBoard(cfg.rows, cfg.cols),
      firstClickDone: false,
      isDetonating: false,
      isGameOver: false,
      gameOverReason: '',
      victoryPending: false,
      victoryShown: false,
      omegaCoreAlive: false,
      activeTool: 'dig',
      lastWireTool: 'c4',
      surgicalBonusMult: 0,
      tutorialMode: false,
      tutorialStep: 0,
      shopOpen: false,
      shopSummary: null,
      shopRelicChoices: [],
      relicDraftTaken: false,
      shopRerollsUsed: 0,
      upgradeCounts: createInitialUpgradeCounts(),
    };

    return state;
  }

  getSnapshot(): GameSnapshot {
    return this.state;
  }

  hasRelic(id: RelicId): boolean {
    return this.state.relics.includes(id);
  }

  startNewRun(seed?: string, chassisId?: ChassisId): void {
    const nextChassis = chassisId ?? this.state.chassisId;
    const nextSeed = seed ? normalizeSeed(seed) : generateReadableSeed();
    this.rng = new SeededRng(nextSeed);
    this.wireOrderCounter = 0;
    this.autoWireUsedThisSector = false;
    this.state = this.buildInitialRunState(nextSeed, nextChassis);
    this.startSector(1);
  }

  startTutorial(): void {
    this.wireOrderCounter = 0;
    this.autoWireUsedThisSector = false;
    const cfg = TUTORIAL_SECTOR_CONFIG;
    this.state = {
      ...this.buildInitialRunState('TUTORIAL', 'demolisher'),
      sector: 0,
      config: cfg,
      sectorTarget: cfg.target,
      moves: cfg.moves,
      charges: { c4: 2, arc: 2, cross: 1, amp: 1, prism: 1, siphon: 1, sonar: 1 },
      board: createTutorialBoard(),
      firstClickDone: true,
      tutorialMode: true,
      tutorialStep: 1,
      activeTool: 'dig',
    };
  }

  startSector(sectorNum: number): void {
    const cfg = getSectorConfig(sectorNum);
    this.state.sector = sectorNum;
    this.state.config = cfg;
    this.state.sectorTarget = cfg.target;
    this.state.sectorScore = 0;
    this.state.moves =
      cfg.moves + this.state.bonusMoves + (this.hasRelic('fast_drill') ? 5 : 0);
    this.state.movesSinceBastion = 0;
    this.state.charges = {
      ...this.state.baseCharges,
      sonar: this.state.baseCharges.sonar + (this.hasRelic('fast_drill') ? 1 : 0),
    };
    this.state.board = createEmptyBoard(cfg.rows, cfg.cols);
    this.state.firstClickDone = false;
    this.state.isDetonating = false;
    this.state.omegaCoreAlive = cfg.anomaly === 'omega';
    this.state.surgicalBonusMult = 0;
    this.state.activeTool = 'dig';
    this.state.shopOpen = false;
    this.state.shopSummary = null;
    this.state.victoryPending = false;
    this.wireOrderCounter = 0;
    this.autoWireUsedThisSector = false;
  }

  setTool(tool: ToolId): void {
    this.state.activeTool = tool;
    if (MODULES[tool].isWire) {
      this.state.lastWireTool = tool as WireModuleId;
    }
  }

  getWiredCells(): Cell[] {
    return getWiredCells(this.state.board);
  }

  getArcNetwork(overrideList?: { r: number; c: number; wire: WireModuleId | null }[]): ArcNetwork {
    const list = overrideList ?? this.getWiredCells();
    return computeArcNetwork(list, this.hasRelic('arc_diag'));
  }

  getDetonationContext(): DetonationContext {
    return {
      chassisId: this.state.chassisId,
      relics: [...this.state.relics],
      anomaly: this.state.config.anomaly,
      surgicalBonusMult: this.state.surgicalBonusMult,
      sectorScore: this.state.sectorScore,
      sectorTarget: this.state.sectorTarget,
      shields: this.state.shields,
      maxShields: this.state.maxShields,
    };
  }

  getSalvoEstimate(): SalvoBreakdown {
    return estimateSalvo(
      this.state.board,
      this.getWiredCells(),
      this.getDetonationContext(),
    );
  }

  handleCellAction(r: number, c: number, isSecondaryClick = false): ActionFeedback {
    if (this.state.isDetonating || this.state.isGameOver || this.state.shopOpen) {
      return { ok: false };
    }
    const cell = this.state.board[r]?.[c];
    if (!cell) return { ok: false };

    if (this.state.tutorialMode) {
      return this.handleTutorialClick(r, c);
    }

    // Secondary click (right-click / long-press): Quick Wire/Unwire (or Pin if Pin tool selected)
    if (isSecondaryClick) {
      if (cell.revealed || cell.armored) return { ok: false };
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Scava prima una cella per iniziare la ricognizione!',
          toastTone: 'warn',
        };
      }
      if (this.state.activeTool === 'pin') {
        return this.togglePin(cell);
      }
      if (cell.wire) {
        return this.unwireCell(cell);
      }
      let wireToUse: WireModuleId | undefined = this.state.lastWireTool;
      if (this.state.charges[wireToUse] <= 0) {
        wireToUse = WIRE_MODULE_IDS.find((k) => this.state.charges[k] > 0);
      }
      if (wireToUse) {
        return this.wireCell(cell, wireToUse);
      }
      return this.togglePin(cell);
    }

    const tool = this.state.activeTool;

    if (tool === 'pin') {
      if (cell.revealed || cell.armored) return { ok: false };
      if (cell.wire) {
        return {
          ok: false,
          toast: 'Rimuovi prima il modulo esplosivo se vuoi mettere una Nota.',
          toastTone: 'warn',
        };
      }
      return this.togglePin(cell);
    }

    if (tool === 'sonar') {
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Fai prima uno scavo iniziale per mappare il settore!',
          toastTone: 'warn',
        };
      }
      return this.useSonar(r, c);
    }

    if (MODULES[tool].isWire) {
      const wireId = tool as WireModuleId;
      if (cell.revealed) return { ok: false };
      if (cell.armored) {
        return {
          ok: false,
          toast: 'Placca corazzata! Rompila con una Croce o un Ponte Arco.',
          toastTone: 'warn',
        };
      }
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Scava prima una cella per iniziare la ricognizione!',
          toastTone: 'warn',
        };
      }
      if (cell.wire === wireId) {
        return this.unwireCell(cell);
      }
      if (cell.wire) {
        if (this.state.charges[wireId] <= 0) {
          return {
            ok: false,
            toast: `Cariche ${MODULES[wireId].name} esaurite!`,
            toastTone: 'danger',
          };
        }
        this.state.charges[cell.wire]++;
        this.state.charges[wireId]--;
        cell.wire = wireId;
        return { ok: true, sfx: 'wire', sfxParam: wireId };
      }
      return this.wireCell(cell, wireId);
    }

    // DIG tool
    if (cell.armored) {
      return {
        ok: false,
        toast: 'Placca corazzata: impossibile scavare! Frantumala con un blast.',
        toastTone: 'warn',
      };
    }
    if (cell.wire || cell.pinned) {
      return {
        ok: false,
        toast: 'Cella protetta da carica o Nota! Rimuovila prima di scavare.',
        toastTone: 'warn',
      };
    }

    // Smart Chord on revealed number
    if (cell.revealed) {
      if (!cell.scrambled && cell.adjMines > 0) {
        return this.tryChord(cell);
      }
      return { ok: false };
    }

    // First click initializes board deterministically for this sector
    if (!this.state.firstClickDone) {
      const sectorRng = this.rng.fork(`sector:${this.state.sector}`);
      populateMinesAndAnomalies(
        this.state.board,
        this.state.config,
        r,
        c,
        sectorRng,
      );
      this.state.firstClickDone = true;
      this.state.omegaCoreAlive = this.state.board.some((row) =>
        row.some((tile) => tile.omegaCore),
      );
    }

    if (this.state.moves <= 0) {
      return {
        ok: false,
        toast: 'Mosse esaurite! Cabla le mine dedotte e premi DETONA.',
        toastTone: 'danger',
      };
    }

    this.state.moves--;
    const fb = this.digCell(cell);
    this.tickBastionIfNeeded(fb);
    this.evaluatePostActionEndState();
    return fb;
  }

  private handleTutorialClick(r: number, c: number): ActionFeedback {
    const step = this.state.tutorialStep;
    const spec = TUTORIAL_STEPS[step];
    if (!spec || spec.finished) return { ok: false };

    if (step === 1) {
      if (r !== 2 || c !== 0) {
        return {
          ok: false,
          toast: 'Tutorial: clicca la cella evidenziata a sinistra!',
          toastTone: 'info',
        };
      }
      floodReveal(this.state.board, 2, 0);
      this.state.tutorialStep = 2;
      this.setTool('amp');
      return { ok: true, sfx: 'reveal_big' };
    }

    if (step === 2) {
      if (r !== 3 || c !== 3) {
        return {
          ok: false,
          toast: 'Tutorial: cabla la mina in basso con Amplificatore ×2 (#1)!',
          toastTone: 'info',
        };
      }
      this.setTool('amp');
      this.wireCell(this.state.board[3][3], 'amp');
      this.state.tutorialStep = 3;
      this.setTool('arc');
      return { ok: true, sfx: 'wire', sfxParam: 'amp' };
    }

    if (step === 3) {
      if (r !== 1 || c !== 3) {
        return {
          ok: false,
          toast: 'Tutorial: cabla la mina in alto con Ponte Arco (#2)!',
          toastTone: 'info',
        };
      }
      this.setTool('arc');
      this.wireCell(this.state.board[1][3], 'arc');
      this.state.tutorialStep = 4;
      return { ok: true, sfx: 'wire', sfxParam: 'arc' };
    }

    if (step === 4) {
      return {
        ok: false,
        toast: 'Tutorial: circuito pronto! Premi il pulsante DETONA.',
        toastTone: 'warn',
      };
    }

    return { ok: false };
  }

  private togglePin(cell: Cell): ActionFeedback {
    cell.pinned = !cell.pinned;
    return { ok: true, sfx: 'pin' };
  }

  private wireCell(cell: Cell, type: WireModuleId): ActionFeedback {
    if (this.state.charges[type] <= 0) {
      return {
        ok: false,
        toast: `Cariche ${MODULES[type].name} esaurite!`,
        toastTone: 'danger',
      };
    }
    this.state.charges[type]--;
    cell.wire = type;
    cell.pinned = false;
    cell.sonarPing = false;
    cell.wireOrder = ++this.wireOrderCounter;
    return { ok: true, sfx: 'wire', sfxParam: type };
  }

  private unwireCell(cell: Cell): ActionFeedback {
    if (!cell.wire) return { ok: false };
    this.state.charges[cell.wire]++;
    cell.wire = null;
    cell.wireOrder = 0;
    this.normalizeWireOrders();
    return { ok: true, sfx: 'unwire' };
  }

  undoLastWire(): ActionFeedback {
    if (this.state.isDetonating || this.state.tutorialMode) return { ok: false };
    const wired = this.getWiredCells();
    if (wired.length === 0) return { ok: false };
    const last = wired[wired.length - 1];
    this.unwireCell(last);
    return {
      ok: true,
      sfx: 'unwire',
      toast: `Rimossa l'ultima carica (#${wired.length}).`,
      toastTone: 'neutral',
    };
  }

  reverseWireOrder(): ActionFeedback {
    if (this.state.isDetonating || this.state.tutorialMode) return { ok: false };
    const wired = this.getWiredCells();
    if (wired.length < 2) return { ok: false };
    const total = wired.length;
    wired.forEach((cell, idx) => {
      cell.wireOrder = total - idx;
    });
    this.wireOrderCounter = total;
    return {
      ok: true,
      sfx: 'pin',
      toast: 'Ordine di innesco invertito! Controlla la nuova stima.',
      toastTone: 'info',
    };
  }

  disarmAllWires(): ActionFeedback {
    if (this.state.isDetonating || this.state.tutorialMode) return { ok: false };
    const wired = this.getWiredCells();
    if (wired.length === 0) return { ok: false };
    for (const cell of wired) {
      if (cell.wire) {
        this.state.charges[cell.wire]++;
        cell.wire = null;
        cell.wireOrder = 0;
      }
    }
    this.wireOrderCounter = 0;
    return {
      ok: true,
      sfx: 'unwire',
      toast: 'Tutte le cariche recuperate nell’inventario.',
      toastTone: 'neutral',
    };
  }

  private normalizeWireOrders(): void {
    const wired = this.getWiredCells();
    wired.forEach((cell, idx) => {
      cell.wireOrder = idx + 1;
    });
    this.wireOrderCounter = wired.length;
  }

  private useSonar(r: number, c: number): ActionFeedback {
    if (this.state.charges.sonar <= 0) {
      return {
        ok: false,
        toast: 'Cariche Sonar esaurite!',
        toastTone: 'danger',
      };
    }
    this.state.charges.sonar--;
    const res = scanSonarArea(
      this.state.board,
      r,
      c,
      this.rng.fork(`sonar:${this.state.sector}:${r},${c}:${this.state.charges.sonar}`),
    );
    if (this.state.charges.sonar <= 0) {
      this.setTool('dig');
    }
    if (res.found) {
      return {
        ok: true,
        sfx: 'sonar',
        sonarHit: { r, c, targetR: res.found.r, targetC: res.found.c },
        popups: [
          {
            r: res.found.r,
            c: res.found.c,
            text: 'MINA!',
            color: '#34d399',
            big: true,
          },
        ],
        toast: `Sonar: rilevata 1 mina sicura nell'area 3×3! (${res.totalMinesInArea} mine qui)`,
        toastTone: 'success',
      };
    }
    return {
      ok: true,
      sfx: 'sonar',
      sonarHit: { r, c },
      toast: 'Sonar: nessuna mina nascosta non cablata in quest’area 3×3!',
      toastTone: 'success',
    };
  }

  private digCell(cell: Cell): ActionFeedback {
    if (cell.isMine) {
      if (this.hasRelic('auto_wire') && !this.autoWireUsedThisSector) {
        this.autoWireUsedThisSector = true;
        cell.wire = 'c4';
        cell.wireOrder = ++this.wireOrderCounter;
        cell.pinned = false;
        return {
          ok: true,
          sfx: 'wire',
          sfxParam: 'c4',
          hitMine: { r: cell.r, c: cell.c, autoWired: true },
          triggeredRelic: { id: 'auto_wire', label: 'SALVA C4' },
          popups: [
            {
              r: cell.r,
              c: cell.c,
              text: 'SALVA-INNESCO!',
              color: '#34d399',
              big: true,
            },
          ],
          toast: 'Salva-Innesco attivato! Mina cablata in C4 senza danni.',
          toastTone: 'success',
        };
      }

      // Stepping on Omega Core deals 1 shield and does NOT clear it — it stays armed!
      if (cell.omegaCore) {
        this.state.shields--;
        return {
          ok: true,
          sfx: 'dud',
          hitMine: { r: cell.r, c: cell.c },
          popups: [
            {
              r: cell.r,
              c: cell.c,
              text: 'NUCLEO! -1 SCUDO',
              color: '#ff5d47',
              big: true,
            },
          ],
          toast: 'Il Nucleo Omega non si scava: cablalo e fallo esplodere! -1 Scudo.',
          toastTone: 'danger',
        };
      }

      cell.isMine = false;
      cell.revealed = true;
      cell.crater = true;
      this.state.shields--;
      recalculateCounts(this.state.board, false);

      return {
        ok: true,
        sfx: 'dud',
        hitMine: { r: cell.r, c: cell.c },
        popups: [
          {
            r: cell.r,
            c: cell.c,
            text: '-1 SCUDO!',
            color: '#ff5d47',
            big: true,
          },
        ],
        toast: 'Mina colpita durante lo scavo! -1 Scudo.',
        toastTone: 'danger',
      };
    }

    const res = floodReveal(this.state.board, cell.r, cell.c);
    const popups: ActionFeedback['popups'] = [];
    for (const cr of res.crystalsCollected) {
      this.state.credits += cr.credits;
      popups.push({ r: cr.r, c: cr.c, text: `+${cr.credits} ₡`, color: '#58c4dc' });
    }

    let triggeredRelic: ActionFeedback['triggeredRelic'];
    let toast: string | undefined;
    let toastTone: ActionFeedback['toastTone'] = 'neutral';

    // Surgeon passive: 4+ cascade grants +12₡
    if (this.state.chassisId === 'surgeon' && res.revealedCount >= 4) {
      this.state.credits += 12;
      popups.push({ r: cell.r, c: cell.c, text: '+12 ₡', color: '#4ade80' });
    }

    if (this.hasRelic('surgical') && res.revealedCount >= 5) {
      this.state.charges.c4++;
      this.state.surgicalBonusMult = +(this.state.surgicalBonusMult + 0.3).toFixed(2);
      triggeredRelic = { id: 'surgical', label: '+1 C4 / +0.3×' };
      popups.push({
        r: cell.r,
        c: cell.c,
        text: '+1 C4 · +0.3×',
        color: '#58c4dc',
      });
      toast = 'Protocollo Chirurgico! Cascata ampia: +1 C4 e +0.3× alla prossima salva.';
      toastTone = 'info';
    }

    return {
      ok: true,
      sfx:
        res.crystalsCollected.length > 0
          ? 'crystal'
          : res.revealedCount > 4
            ? 'reveal_big'
            : 'reveal',
      crystals: res.crystalsCollected,
      popups,
      triggeredRelic,
      toast,
      toastTone,
    };
  }

  private tryChord(cell: Cell): ActionFeedback {
    const neighbors = getNeighbors(this.state.board, cell.r, cell.c);
    const markedAround = neighbors.filter((n) => n.wire !== null || n.pinned).length;
    if (markedAround !== cell.adjMines) return { ok: false };

    const targets = neighbors.filter(
      (n) => !n.revealed && !n.wire && !n.pinned && !n.armored,
    );
    if (targets.length === 0) return { ok: false };

    const isFreeChord = this.state.chassisId === 'surgeon';
    if (!isFreeChord && this.state.moves <= 0) {
      return {
        ok: false,
        toast: 'Mosse esaurite! Cabla le mine dedotte e premi DETONA.',
        toastTone: 'danger',
      };
    }

    if (!isFreeChord) {
      this.state.moves--;
    }

    let totalRevealed = 0;
    const allCrystals: { r: number; c: number; credits: number }[] = [];
    const popups: NonNullable<ActionFeedback['popups']> = [];

    for (const t of targets) {
      if (t.revealed || t.wire || t.pinned || t.armored) continue;
      if (t.isMine) {
        const mineFb = this.digCell(t);
        if (!isFreeChord) this.tickBastionIfNeeded(mineFb);
        this.evaluatePostActionEndState();
        return mineFb;
      }
      const res = floodReveal(this.state.board, t.r, t.c);
      totalRevealed += res.revealedCount;
      for (const cr of res.crystalsCollected) {
        this.state.credits += cr.credits;
        allCrystals.push(cr);
        popups.push({ r: cr.r, c: cr.c, text: `+${cr.credits} ₡`, color: '#58c4dc' });
      }
    }

    let triggeredRelic: ActionFeedback['triggeredRelic'];
    let toast: string | undefined;
    let toastTone: ActionFeedback['toastTone'] = 'neutral';

    if (this.state.chassisId === 'surgeon' && totalRevealed >= 4) {
      this.state.credits += 12;
      popups.push({ r: cell.r, c: cell.c, text: '+12 ₡', color: '#4ade80' });
    }

    if (this.hasRelic('surgical') && totalRevealed >= 5) {
      this.state.charges.c4++;
      this.state.surgicalBonusMult = +(this.state.surgicalBonusMult + 0.3).toFixed(2);
      triggeredRelic = { id: 'surgical', label: '+1 C4 / +0.3×' };
      popups.push({
        r: cell.r,
        c: cell.c,
        text: '+1 C4 · +0.3×',
        color: '#58c4dc',
      });
      toast = 'Protocollo Chirurgico! +1 C4 e +0.3× alla prossima salva.';
      toastTone = 'info';
    }

    const fb: ActionFeedback = {
      ok: true,
      sfx:
        allCrystals.length > 0
          ? 'crystal'
          : totalRevealed > 4
            ? 'reveal_big'
            : 'reveal',
      crystals: allCrystals,
      popups,
      triggeredRelic,
      toast,
      toastTone,
    };

    if (!isFreeChord) this.tickBastionIfNeeded(fb);
    this.evaluatePostActionEndState();
    return fb;
  }

  private tickBastionIfNeeded(fb: ActionFeedback): void {
    const interval = this.state.config.bastionInterval;
    if (!interval || this.state.config.anomaly !== 'bastion') return;
    if (this.state.isGameOver || this.state.tutorialMode) return;

    this.state.movesSinceBastion++;
    if (this.state.movesSinceBastion >= interval) {
      this.state.movesSinceBastion = 0;
      const armored = applyBastionArmor(
        this.state.board,
        2,
        this.rng.fork(`bastion:${this.state.sector}:${this.state.moves}`),
      );
      if (armored.length > 0) {
        fb.bastionArmored = armored;
        fb.toast = `BASTIONE: ${armored.length} celle coperte sono state corazzate!`;
        fb.toastTone = 'warn';
      }
    }
  }

  /**
   * Computes a pure DetonationResolution plan and locks input while UI plays it back.
   */
  beginDetonation(): DetonationResolution | null {
    if (this.state.isDetonating || this.state.isGameOver || this.state.shopOpen) {
      return null;
    }
    if (this.state.tutorialMode && this.state.tutorialStep !== 4) {
      return null;
    }
    const wired = this.getWiredCells();
    if (wired.length === 0) return null;

    this.state.isDetonating = true;
    const resolution = resolveDetonation(
      this.state.board,
      wired,
      this.getDetonationContext(),
    );
    return resolution;
  }

  /**
   * Commits the completed DetonationResolution onto live state.
   * Called after the UI player finishes animating (or directly in unit tests).
   */
  commitDetonation(res: DetonationResolution): {
    totalClearBonus: number;
    sectorCleared: boolean;
    campaignVictory: boolean;
    gameOver: boolean;
    tutorialDone: boolean;
  } {
    this.state.board = res.endBoardSnapshot;
    this.state.surgicalBonusMult = 0;
    this.wireOrderCounter = 0;

    // Apply shields, moves, hotspot arc refills, credits, points from events
    for (const ev of res.events) {
      if (ev.kind === 'dud') {
        this.state.shields = Math.max(0, this.state.shields - 1);
      } else if (ev.kind === 'blast') {
        this.state.sectorScore += ev.finalPts;
        if (!this.state.tutorialMode) {
          this.state.totalScore += ev.finalPts;
          this.state.totalMinesDetonated++;
        }
        this.state.moves += ev.movesGained;
        if (ev.shieldsGained > 0 && this.state.shields > 0) {
          this.state.shields = Math.min(
            this.state.maxShields,
            this.state.shields + ev.shieldsGained,
          );
        }
        if (ev.isHotspot && this.hasRelic('hotspot_master')) {
          this.state.charges.arc++;
        }
      } else if (ev.kind === 'armor_break') {
        this.state.sectorScore += ev.points;
        if (!this.state.tutorialMode) {
          this.state.totalScore += ev.points;
        }
      } else if (ev.kind === 'relic_trigger') {
        if (ev.relicId === 'kinetic_shield' && this.state.shields > 0) {
          this.state.shields = Math.min(this.state.maxShields, this.state.shields + 1);
        }
      } else if (ev.kind === 'salvo_summary') {
        this.state.credits += ev.salvoCredits;
        this.state.moves += ev.echoMovesGained;
      }
    }

    if (res.omegaCoreDestroyed) {
      this.state.omegaCoreAlive = false;
    }

    if (!this.state.tutorialMode && res.chainCount > this.state.maxChain) {
      this.state.maxChain = res.chainCount;
    }

    this.state.isDetonating = false;

    if (this.state.tutorialMode) {
      this.state.tutorialStep = 5;
      return {
        totalClearBonus: 0,
        sectorCleared: false,
        campaignVictory: false,
        gameOver: false,
        tutorialDone: true,
      };
    }

    if (this.state.shields <= 0) {
      this.triggerGameOver('Scudi esauriti durante la detonazione.');
      return {
        totalClearBonus: 0,
        sectorCleared: false,
        campaignVictory: false,
        gameOver: true,
        tutorialDone: false,
      };
    }

    // Fair Total Clear bonus ONLY when detonation actually destroyed >=1 mine & cleared the last mine!
    let totalClearBonus = 0;
    const liveMines = countLiveMines(this.state.board);
    if (
      this.state.firstClickDone &&
      res.chainCount > 0 &&
      liveMines === 0 &&
      !this.state.omegaCoreAlive &&
      this.state.sectorScore < this.state.sectorTarget
    ) {
      totalClearBonus = Math.max(300, this.state.sectorTarget - this.state.sectorScore);
      this.state.sectorScore += totalClearBonus;
      this.state.totalScore += totalClearBonus;
    }

    // Check sector clear (Boss S6 requires Omega Core destroyed too!)
    if (
      this.state.sectorScore >= this.state.sectorTarget &&
      !this.state.omegaCoreAlive
    ) {
      if (this.state.sector === 6 && !this.state.victoryShown) {
        this.state.victoryShown = true;
        this.state.victoryPending = true;
        return {
          totalClearBonus,
          sectorCleared: true,
          campaignVictory: true,
          gameOver: false,
          tutorialDone: false,
        };
      }
      return {
        totalClearBonus,
        sectorCleared: true,
        campaignVictory: false,
        gameOver: false,
        tutorialDone: false,
      };
    }

    this.evaluatePostActionEndState();

    return {
      totalClearBonus,
      sectorCleared: false,
      campaignVictory: false,
      gameOver: this.state.isGameOver,
      tutorialDone: false,
    };
  }

  /** Convenience synchronous detonation for tests. */
  executeDetonationSync(): DetonationResolution | null {
    const res = this.beginDetonation();
    if (!res) return null;
    this.commitDetonation(res);
    return res;
  }

  private getTotalWireCharges(): number {
    return WIRE_MODULE_IDS.reduce((sum, id) => sum + this.state.charges[id], 0);
  }

  private evaluatePostActionEndState(): void {
    if (this.state.isGameOver || this.state.tutorialMode) return;

    if (this.state.shields <= 0) {
      this.triggerGameOver('Scudi esauriti durante la demolizione.');
      return;
    }

    if (
      this.state.sectorScore >= this.state.sectorTarget &&
      !this.state.omegaCoreAlive
    ) {
      return;
    }

    const wiredCount = this.getWiredCells().length;
    const totalWireCharges = this.getTotalWireCharges();
    const liveMines = this.state.firstClickDone
      ? countLiveMines(this.state.board)
      : this.state.config.mines;

    // Anti-softlock: 0 live mines remaining without reaching quota
    if (this.state.firstClickDone && liveMines === 0) {
      this.triggerGameOver('Nessuna mina rimasta nel settore prima di raggiungere la Quota.');
      return;
    }

    // Anti-softlock: 0 wired and 0 wire charges left and no way to generate a charge
    const canGainCharge =
      (this.hasRelic('auto_wire') && !this.autoWireUsedThisSector && this.state.moves > 0) ||
      (this.hasRelic('surgical') && this.state.moves > 0);
    if (wiredCount === 0 && totalWireCharges === 0 && !canGainCharge) {
      this.triggerGameOver('Cariche esplosive esaurite prima della Quota Demolizione.');
    }
  }

  private triggerGameOver(reason: string): void {
    this.state.isGameOver = true;
    this.state.gameOverReason = reason;
  }

  // ==================== OFFICINA TATTICA (SHOP) ====================

  openShop(): ShopSummary {
    const baseReward = 65 + this.state.sector * 15;
    const moveBonus = this.state.moves * 4;
    const overkillBonus = Math.min(
      110,
      Math.max(0, Math.floor((this.state.sectorScore - this.state.sectorTarget) / 20)),
    );
    const totalEarned = baseReward + moveBonus + overkillBonus;
    this.state.credits += totalEarned;
    this.state.shopOpen = true;
    this.state.victoryPending = false;
    this.state.relicDraftTaken = false;
    this.state.shopRerollsUsed = 0;

    const summary: ShopSummary = {
      baseReward,
      moveBonus,
      overkillBonus,
      totalEarned,
    };
    this.state.shopSummary = summary;
    this.rollShopRelics();
    return summary;
  }

  rollShopRelics(): RelicId[] {
    const pool = RELIC_CATALOG.filter((r) => !this.state.relics.includes(r.id)).map(
      (r) => r.id,
    );
    const shopRng = this.rng.fork(
      `shop:${this.state.sector}:roll:${this.state.shopRerollsUsed}`,
    );
    shopRng.shuffle(pool);
    const choices = pool.slice(0, 3);
    this.state.shopRelicChoices = choices;
    if (choices.length === 0) {
      this.state.relicDraftTaken = true;
    }
    return choices;
  }

  draftRelic(id: RelicId): boolean {
    if (!this.state.shopOpen || this.state.relicDraftTaken) return false;
    if (!this.state.shopRelicChoices.includes(id)) return false;
    this.state.relicDraftTaken = true;
    this.state.relics.push(id);
    return true;
  }

  skipRelicDraft(): boolean {
    if (!this.state.shopOpen || this.state.relicDraftTaken) return false;
    this.state.relicDraftTaken = true;
    this.state.credits += 60;
    return true;
  }

  rerollShopRelics(): boolean {
    if (!this.state.shopOpen || this.state.relicDraftTaken) return false;
    const cost = getRerollCost(this.state.shopRerollsUsed);
    if (this.state.credits < cost) return false;
    this.state.credits -= cost;
    this.state.shopRerollsUsed++;
    this.rollShopRelics();
    return true;
  }

  getUpgradePrice(id: ShopUpgradeId): number {
    const def = SHOP_UPGRADES.find((u) => u.id === id)!;
    return getUpgradeCost(def, this.state.upgradeCounts[id]);
  }

  canBuyUpgrade(id: ShopUpgradeId): boolean {
    if (!this.state.shopOpen) return false;
    const def = SHOP_UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const count = this.state.upgradeCounts[id];
    if (def.maxPurchases !== undefined && count >= def.maxPurchases) return false;
    if (id === 'repair_shield' && this.state.shields >= this.state.maxShields) {
      return false;
    }
    if (id === 'max_shield' && this.state.maxShields >= 6) return false;
    return this.state.credits >= getUpgradeCost(def, count);
  }

  buyUpgrade(id: ShopUpgradeId): boolean {
    if (!this.canBuyUpgrade(id)) return false;
    const cost = this.getUpgradePrice(id);
    this.state.credits -= cost;
    this.state.upgradeCounts[id]++;

    switch (id) {
      case 'repair_shield':
        this.state.shields = Math.min(this.state.maxShields, this.state.shields + 1);
        break;
      case 'max_shield':
        this.state.maxShields = Math.min(6, this.state.maxShields + 1);
        this.state.shields = Math.min(this.state.maxShields, this.state.shields + 1);
        break;
      case 'add_c4':
        this.state.baseCharges.c4 += 2;
        break;
      case 'add_arc':
        this.state.baseCharges.arc += 1;
        break;
      case 'add_cross':
        this.state.baseCharges.cross += 1;
        break;
      case 'add_amp':
        this.state.baseCharges.amp += 1;
        break;
      case 'add_prism':
        this.state.baseCharges.prism += 1;
        break;
      case 'add_siphon':
        this.state.baseCharges.siphon += 1;
        break;
      case 'add_sonar':
        this.state.baseCharges.sonar += 1;
        break;
      case 'add_moves':
        this.state.bonusMoves += 4;
        break;
    }
    return true;
  }

  advanceToNextSector(): void {
    this.state.shopOpen = false;
    this.startSector(this.state.sector + 1);
  }
}
