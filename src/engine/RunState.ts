import { CHASSIS_BY_ID } from '../data/chassis';
import {
  createInitialModuleLevels,
  getModuleUpgradeCost,
  MODULES,
  WIRE_MODULE_IDS,
} from '../data/modules';
import { RELIC_CATALOG } from '../data/relics';
import { getSectorConfig, rollRouteContracts } from '../data/sectors';
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
  RouteContract,
  SalvoBreakdown,
  ShopSummary,
  ShopUpgradeId,
  ToolId,
  WireModuleId,
} from '../types/game';
import {
  applyLayoutWalls,
  createEmptyBoard,
  executeBastionArmor,
  populateMinesAndAnomalies,
  selectBastionTargets,
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
    applyLayoutWalls(this.state.board, this.state.config.layout);
  }

  private buildInitialRunState(seed: string, chassisId: ChassisId): GameSnapshot {
    const chassis = CHASSIS_BY_ID[chassisId];
    const cfg = getSectorConfig(1);
    const baseCharges: ChargeBag = { ...chassis.startingCharges };
    const relics: RelicId[] = [...chassis.startingRelics];

    return {
      seed,
      chassisId,
      sector: 1,
      config: cfg,
      shields: chassis.maxShields,
      maxShields: chassis.maxShields,
      credits: 0,
      relics,
      moduleLevels: createInitialModuleLevels(),
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
      canExtract: false,
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
      shopLevelOffers: [],
      shopLevelBought: [],
      shopRouteChoices: [],
      selectedRouteId: null,
      relicDraftTaken: false,
      shopRerollsUsed: 0,
      upgradeCounts: createInitialUpgradeCounts(),
    };
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

  startSector(sectorNum: number, route?: RouteContract | null): void {
    const cfg = getSectorConfig(sectorNum, route);
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
    applyLayoutWalls(this.state.board, cfg.layout);
    this.state.firstClickDone = false;
    this.state.canExtract = false;
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

  getArcNetwork(
    overrideList?: { r: number; c: number; wire: WireModuleId | null }[],
  ): ArcNetwork {
    const list = overrideList ?? this.getWiredCells();
    return computeArcNetwork(list, this.hasRelic('arc_diag'), this.state.board);
  }

  getDetonationContext(): DetonationContext {
    return {
      chassisId: this.state.chassisId,
      relics: [...this.state.relics],
      moduleLevels: { ...this.state.moduleLevels },
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

    if (cell.wall) {
      return {
        ok: false,
        toast: 'Pilastro indistruttibile! Usa lo Specchio per aggirarlo coi Fulmini.',
        toastTone: 'neutral',
      };
    }

    if (cell.barrel) {
      return {
        ok: false,
        toast: 'Barile di Gas: fallo saltare con un’esplosione vicina per un’onda 3×3!',
        toastTone: 'warn',
      };
    }

    if (this.state.tutorialMode) {
      return this.handleTutorialClick(r, c);
    }

    if (isSecondaryClick) {
      if (cell.revealed || cell.armored) return { ok: false };
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Prima scava una casella per iniziare!',
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
          toast: 'C’è già una bomba qui! Smontala per mettere una Bandiera.',
          toastTone: 'warn',
        };
      }
      return this.togglePin(cell);
    }

    if (tool === 'sonar') {
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Fai prima uno scavo iniziale per aprire il campo!',
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
          toast: 'Piastra blindata! Spaccala con Croce o Fulmine.',
          toastTone: 'warn',
        };
      }
      if (!this.state.firstClickDone) {
        return {
          ok: false,
          toast: 'Prima scava una casella per aprire il campo!',
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
            toast: `Hai finito le bombe ${MODULES[wireId].name}!`,
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
        toast: 'Piastra blindata: si rompe solo con un’esplosione!',
        toastTone: 'warn',
      };
    }
    if (cell.wire || cell.pinned) {
      return {
        ok: false,
        toast: 'Casella protetta! Togli la bomba o la Bandiera prima di scavare.',
        toastTone: 'warn',
      };
    }

    if (cell.revealed) {
      if (!cell.scrambled && cell.adjMines > 0) {
        return this.tryChord(cell);
      }
      return { ok: false };
    }

    let wasFirstClick = false;
    if (!this.state.firstClickDone) {
      wasFirstClick = true;
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
        toast: 'Mosse finite! Piazza le bombe sulle mine trovate e premi DETONA.',
        toastTone: 'danger',
      };
    }

    this.state.moves--;
    const fb = this.digCell(cell);
    if (wasFirstClick && this.state.config.anomaly === 'bastion') {
      selectBastionTargets(
        this.state.board,
        2,
        this.rng.fork(`bastion-init:${this.state.sector}`),
      );
    } else {
      this.tickBastionIfNeeded(fb);
    }
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
          toast: 'Tocca la casella illuminata a sinistra!',
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
          toast: 'Tocca la mina in basso illuminata per piazzare il Boost ×2!',
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
          toast: 'Tocca la mina in alto illuminata per piazzare il Fulmine!',
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
        toast: 'Tutto pronto! Premi il grande pulsante rosso DETONA.',
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
        toast: `Hai finito le bombe ${MODULES[type].name}!`,
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
      toast: `Tolto l’ultimo esplosivo (#${wired.length}).`,
      toastTone: 'neutral',
    };
  }

  /**
   * One-tap sequence reordering: tapping chip at index `idx` moves it 1 step earlier
   * (or sends #1 to the end), letting players optimize firing order with one thumb!
   */
  nudgeWireStep(idx: number): ActionFeedback {
    if (this.state.isDetonating || this.state.tutorialMode) return { ok: false };
    const wired = this.getWiredCells();
    if (wired.length < 2 || idx < 0 || idx >= wired.length) return { ok: false };

    const reordered = [...wired];
    if (idx === 0) {
      const first = reordered.shift()!;
      reordered.push(first);
    } else {
      [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    }
    reordered.forEach((cell, i) => {
      cell.wireOrder = i + 1;
    });
    this.wireOrderCounter = reordered.length;

    return {
      ok: true,
      sfx: 'pin',
      toast: 'Sequenza aggiornata! Controlla la nuova stima.',
      toastTone: 'info',
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
      toast: 'Ordine di scoppio invertito! Guarda i nuovi punti stimati.',
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
      toast: 'Tutte le bombe sono tornate nello zaino.',
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
      return { ok: false, toast: 'Hai finito i Radar!', toastTone: 'danger' };
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
        toast: `Radar: trovata 1 mina sicura! (${res.totalMinesInArea} in questa zona)`,
        toastTone: 'success',
      };
    }
    return {
      ok: true,
      sfx: 'sonar',
      sonarHit: { r, c },
      toast: 'Radar: nessuna mina nascosta in questa zona 3×3!',
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
          triggeredRelic: { id: 'auto_wire', label: 'SALVAVITA' },
          popups: [
            {
              r: cell.r,
              c: cell.c,
              text: 'SALVAVITA!',
              color: '#34d399',
              big: true,
            },
          ],
          toast: 'Riflesso d’Acciaio! Hai piazzato un C4 sulla mina senza danni.',
          toastTone: 'success',
        };
      }

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
          toast: 'Il Nucleo rosso non si scava: piazzaci sopra una bomba! -1 Scudo.',
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
        toast: 'BOOM! Hai scavato su una mina (-1 Scudo).',
        toastTone: 'danger',
      };
    }

    const res = floodReveal(this.state.board, cell.r, cell.c);
    const popups: NonNullable<ActionFeedback['popups']> = [];
    for (const cr of res.crystalsCollected) {
      this.state.credits += cr.credits;
      popups.push({ r: cr.r, c: cr.c, text: `+${cr.credits} ₡`, color: '#58c4dc' });
    }

    let toast: string | undefined;
    let toastTone: ActionFeedback['toastTone'] = 'neutral';

    if (res.bastionBlocked > 0) {
      popups.push({ r: cell.r, c: cell.c, text: 'BLOCCATO!', color: '#4ade80', big: true });
      toast = 'Ottima mossa! Hai impedito al Bastione di corazzare la casella!';
      toastTone = 'success';
    }

    let triggeredRelic: ActionFeedback['triggeredRelic'];

    if (this.state.chassisId === 'surgeon' && res.revealedCount >= 4) {
      this.state.credits += 12;
      popups.push({ r: cell.r, c: cell.c, text: '+12 ₡', color: '#4ade80' });
    }

    if (this.hasRelic('surgical') && res.revealedCount >= 5) {
      this.state.charges.c4++;
      this.state.surgicalBonusMult = +(this.state.surgicalBonusMult + 0.3).toFixed(2);
      triggeredRelic = { id: 'surgical', label: '+1 C4 / +0.3×' };
      popups.push({ r: cell.r, c: cell.c, text: '+1 C4 · +0.3×', color: '#58c4dc' });
      toast = 'Scavo Perfetto! +1 C4 e +0.3× alla prossima esplosione.';
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
      (n) => !n.revealed && !n.wall && !n.barrel && !n.wire && !n.pinned && !n.armored,
    );
    if (targets.length === 0) return { ok: false };

    const isFreeChord = this.state.chassisId === 'surgeon';
    if (!isFreeChord && this.state.moves <= 0) {
      return {
        ok: false,
        toast: 'Mosse finite! Piazza le bombe sulle mine trovate e premi DETONA.',
        toastTone: 'danger',
      };
    }

    if (!isFreeChord) {
      this.state.moves--;
    }

    let totalRevealed = 0;
    let totalBastionBlocked = 0;
    const allCrystals: { r: number; c: number; credits: number }[] = [];
    const popups: NonNullable<ActionFeedback['popups']> = [];

    for (const t of targets) {
      if (t.revealed || t.wall || t.barrel || t.wire || t.pinned || t.armored) continue;
      if (t.isMine) {
        const mineFb = this.digCell(t);
        if (!isFreeChord) this.tickBastionIfNeeded(mineFb);
        this.evaluatePostActionEndState();
        return mineFb;
      }
      const res = floodReveal(this.state.board, t.r, t.c);
      totalRevealed += res.revealedCount;
      totalBastionBlocked += res.bastionBlocked;
      for (const cr of res.crystalsCollected) {
        this.state.credits += cr.credits;
        allCrystals.push(cr);
        popups.push({ r: cr.r, c: cr.c, text: `+${cr.credits} ₡`, color: '#58c4dc' });
      }
    }

    let triggeredRelic: ActionFeedback['triggeredRelic'];
    let toast: string | undefined;
    let toastTone: ActionFeedback['toastTone'] = 'neutral';

    if (totalBastionBlocked > 0) {
      popups.push({ r: cell.r, c: cell.c, text: 'BLOCCATO!', color: '#4ade80', big: true });
      toast = 'Hai bloccato la corazzatura del Bastione!';
      toastTone = 'success';
    }

    if (this.state.chassisId === 'surgeon' && totalRevealed >= 4) {
      this.state.credits += 12;
      popups.push({ r: cell.r, c: cell.c, text: '+12 ₡', color: '#4ade80' });
    }

    if (this.hasRelic('surgical') && totalRevealed >= 5) {
      this.state.charges.c4++;
      this.state.surgicalBonusMult = +(this.state.surgicalBonusMult + 0.3).toFixed(2);
      triggeredRelic = { id: 'surgical', label: '+1 C4 / +0.3×' };
      popups.push({ r: cell.r, c: cell.c, text: '+1 C4 · +0.3×', color: '#58c4dc' });
      toast = 'Scavo Perfetto! +1 C4 e +0.3× alla prossima esplosione.';
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
      const armored = executeBastionArmor(
        this.state.board,
        this.rng.fork(`bastion:${this.state.sector}:${this.state.moves}`),
      );
      if (armored.length > 0) {
        fb.bastionArmored = armored;
        fb.toast = `BASTIONE: ${armored.length} caselle blindate! Nuovi mirini attivi.`;
        fb.toastTone = 'warn';
      } else {
        fb.toast = 'BASTIONE respinto! Hai scavato tutti i suoi bersagli in tempo!';
        fb.toastTone = 'success';
      }
    }
  }

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
    return resolveDetonation(
      this.state.board,
      wired,
      this.getDetonationContext(),
    );
  }

  commitDetonation(res: DetonationResolution): {
    totalClearBonus: number;
    justUnlockedExtract: boolean;
    autoExtract: boolean;
    campaignVictory: boolean;
    gameOver: boolean;
    tutorialDone: boolean;
  } {
    this.state.board = res.endBoardSnapshot;
    this.state.surgicalBonusMult = 0;
    this.wireOrderCounter = 0;

    for (const ev of res.events) {
      if (ev.kind === 'dud') {
        this.state.shields = Math.max(0, this.state.shields - 1);
      } else if (ev.kind === 'omega_shield_break') {
        this.state.sectorScore += ev.points;
        if (!this.state.tutorialMode) this.state.totalScore += ev.points;
      } else if (ev.kind === 'barrel_blast') {
        this.state.sectorScore += ev.finalPts;
        if (!this.state.tutorialMode) this.state.totalScore += ev.finalPts;
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
        justUnlockedExtract: false,
        autoExtract: false,
        campaignVictory: false,
        gameOver: false,
        tutorialDone: true,
      };
    }

    if (this.state.shields <= 0) {
      this.triggerGameOver('Hai perso tutti gli scudi.');
      return {
        totalClearBonus: 0,
        justUnlockedExtract: false,
        autoExtract: false,
        campaignVictory: false,
        gameOver: true,
        tutorialDone: false,
      };
    }

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

    // Push Your Luck: reaching quota unlocks voluntary Extraction!
    const meetsGoal =
      this.state.sectorScore >= this.state.sectorTarget && !this.state.omegaCoreAlive;

    if (meetsGoal) {
      const justUnlockedExtract = !this.state.canExtract;
      this.state.canExtract = true;

      const noMoreAction =
        liveMines === 0 || this.getTotalWireCharges() === 0;

      // Campaign Finale S6 victory or no mines/charges left -> auto-extract cleanly!
      if (this.state.sector === 6 && !this.state.victoryShown) {
        this.state.victoryShown = true;
        this.state.victoryPending = true;
        return {
          totalClearBonus,
          justUnlockedExtract,
          autoExtract: true,
          campaignVictory: true,
          gameOver: false,
          tutorialDone: false,
        };
      }

      return {
        totalClearBonus,
        justUnlockedExtract,
        autoExtract: noMoreAction,
        campaignVictory: false,
        gameOver: false,
        tutorialDone: false,
      };
    }

    this.evaluatePostActionEndState();

    return {
      totalClearBonus,
      justUnlockedExtract: false,
      autoExtract: false,
      campaignVictory: false,
      gameOver: this.state.isGameOver,
      tutorialDone: false,
    };
  }

  /** Voluntary Push-Your-Luck extraction once quota is met. */
  extractFromSector(): { campaignVictory: boolean } | null {
    if (!this.state.canExtract || this.state.isDetonating || this.state.isGameOver) {
      return null;
    }
    if (this.state.sector === 6 && !this.state.victoryShown) {
      this.state.victoryShown = true;
      this.state.victoryPending = true;
      return { campaignVictory: true };
    }
    this.openShop();
    return { campaignVictory: false };
  }

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
      this.triggerGameOver('Hai perso tutti gli scudi.');
      return;
    }

    // Never lose after you already qualified to extract!
    if (this.state.canExtract) return;

    const wiredCount = this.getWiredCells().length;
    const totalWireCharges = this.getTotalWireCharges();
    const liveMines = this.state.firstClickDone
      ? countLiveMines(this.state.board)
      : this.state.config.mines;

    if (this.state.firstClickDone && liveMines === 0) {
      this.triggerGameOver('Non restano più mine per raggiungere l’obiettivo.');
      return;
    }

    const canGainCharge =
      (this.hasRelic('auto_wire') && !this.autoWireUsedThisSector && this.state.moves > 0) ||
      (this.hasRelic('surgical') && this.state.moves > 0);
    if (wiredCount === 0 && totalWireCharges === 0 && !canGainCharge) {
      this.triggerGameOver('Hai finito tutti gli esplosivi prima di battere l’obiettivo.');
    }
  }

  private triggerGameOver(reason: string): void {
    this.state.isGameOver = true;
    this.state.gameOverReason = reason;
  }

  // ==================== ARSENALE & PERCORSO (SHOP) ====================

  openShop(): ShopSummary {
    const baseReward = 65 + this.state.sector * 15;
    const moveBonus = this.state.moves * 4;
    const overkillBonus = Math.min(
      180,
      Math.max(0, Math.floor((this.state.sectorScore - this.state.sectorTarget) / 18)),
    );
    const contractBonus = this.state.config.bonusCredits ?? 0;
    const totalEarned = baseReward + moveBonus + overkillBonus + contractBonus;
    this.state.credits += totalEarned;
    this.state.shopOpen = true;
    this.state.canExtract = false;
    this.state.victoryPending = false;
    this.state.relicDraftTaken = false;
    this.state.shopRerollsUsed = 0;
    this.state.shopLevelBought = [];

    const summary: ShopSummary = {
      baseReward,
      moveBonus,
      overkillBonus,
      contractBonus,
      totalEarned,
    };
    this.state.shopSummary = summary;

    this.rollShopRelics();
    this.rollShopLevelOffers();
    this.state.shopRouteChoices = rollRouteContracts(
      this.state.sector + 1,
      this.rng.fork(`routes:${this.state.sector}`),
    );
    this.state.selectedRouteId = this.state.shopRouteChoices[0]?.id ?? null;

    return summary;
  }

  /** Balanced draft: guarantees >=1 Multiplier Engine relic & >=1 Utility relic when available! */
  rollShopRelics(): RelicId[] {
    const unowned = RELIC_CATALOG.filter((r) => !this.state.relics.includes(r.id));
    const shopRng = this.rng.fork(
      `shop:${this.state.sector}:roll:${this.state.shopRerollsUsed}`,
    );

    const multPool = shopRng.shuffle(unowned.filter((r) => r.category === 'mult'));
    const utilPool = shopRng.shuffle(unowned.filter((r) => r.category === 'utility'));

    const picked: RelicId[] = [];
    if (multPool.length > 0) picked.push(multPool.shift()!.id);
    if (utilPool.length > 0) picked.push(utilPool.shift()!.id);

    const remainder = shopRng.shuffle([...multPool, ...utilPool]);
    while (picked.length < 3 && remainder.length > 0) {
      picked.push(remainder.shift()!.id);
    }

    shopRng.shuffle(picked);
    this.state.shopRelicChoices = picked;
    if (picked.length === 0) {
      this.state.relicDraftTaken = true;
    }
    return picked;
  }

  private rollShopLevelOffers(): void {
    const upgradable = WIRE_MODULE_IDS.filter(
      (id) => this.state.moduleLevels[id] < 3,
    );
    const rng = this.rng.fork(`lvl:${this.state.sector}`);
    rng.shuffle(upgradable);
    this.state.shopLevelOffers = upgradable.slice(0, 2);
  }

  buyModuleLevelUp(id: WireModuleId): boolean {
    if (!this.state.shopOpen) return false;
    if (!this.state.shopLevelOffers.includes(id)) return false;
    if (this.state.shopLevelBought.includes(id)) return false;
    const curLv = this.state.moduleLevels[id];
    if (curLv >= 3) return false;

    const cost = getModuleUpgradeCost(curLv);
    if (this.state.credits < cost) return false;

    this.state.credits -= cost;
    this.state.moduleLevels[id] = curLv + 1;
    this.state.shopLevelBought.push(id);
    return true;
  }

  selectRoute(routeId: string): boolean {
    if (!this.state.shopRouteChoices.some((r) => r.id === routeId)) return false;
    this.state.selectedRouteId = routeId;
    return true;
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
    const chosenRoute =
      this.state.shopRouteChoices.find((r) => r.id === this.state.selectedRouteId) ??
      null;
    this.state.shopOpen = false;
    this.startSector(this.state.sector + 1, chosenRoute);
  }
}
