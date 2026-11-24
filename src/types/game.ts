export type WireModuleId = 'c4' | 'arc' | 'cross' | 'amp' | 'prism' | 'siphon';
export type ToolId = 'dig' | 'pin' | 'sonar' | WireModuleId;

export type ChassisId = 'demolisher' | 'tesla' | 'surgeon';

export type BiomeId = 'industrial' | 'quartz' | 'forge' | 'bunker' | 'emp' | 'omega';

export type AnomalyId =
  | 'none'
  | 'crystals'
  | 'bastion'
  | 'armor'
  | 'scramble'
  | 'omega'
  | 'tutorial';

export type RelicRarity = 'Comune' | 'Raro' | 'Epico';

export type RelicId =
  | 'resonance_3'
  | 'domino'
  | 'arc_diag'
  | 'border_hunter'
  | 'kinetic_shield'
  | 'surgical'
  | 'gold_mine'
  | 'thermal_amp'
  | 'cross_reach'
  | 'auto_wire'
  | 'unstable_core'
  | 'fast_drill'
  | 'seismic_wake'
  | 'hotspot_master'
  | 'armor_piercer'
  | 'seismic_echo'
  | 'regen_siphon'
  | 'chain_overdrive';

export interface ChargeBag {
  c4: number;
  arc: number;
  cross: number;
  amp: number;
  prism: number;
  siphon: number;
  sonar: number;
}

export interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  omegaCore: boolean;
  revealed: boolean;
  crater: boolean;
  armored: boolean;
  crystal: boolean;
  hotspot: boolean;
  scrambled: boolean;
  sonarPing: boolean;
  pinned: boolean;
  wire: WireModuleId | null;
  wireOrder: number;
  adjMines: number;
  prevAdjMines: number | null;
}

export interface ModuleDefinition {
  id: ToolId;
  name: string;
  shortName: string;
  hotkey: string;
  accent: string;
  isWire: boolean;
  basePoints?: number;
  summary: string;
  description: string;
}

export interface RelicDefinition {
  id: RelicId;
  name: string;
  rarity: RelicRarity;
  tag: string;
  accent: string;
  desc: string;
}

export interface ChassisDefinition {
  id: ChassisId;
  code: string;
  name: string;
  role: string;
  accent: string;
  maxShields: number;
  bonusMoves: number;
  startingCharges: ChargeBag;
  startingRelics: RelicId[];
  passiveTitle: string;
  passiveDesc: string;
}

export interface SectorConfig {
  sector: number;
  title: string;
  biome: BiomeId;
  biomeLabel: string;
  rows: number;
  cols: number;
  mines: number;
  target: number;
  moves: number;
  hotspots: number;
  anomaly: AnomalyId;
  isBoss: boolean;
  bossName?: string;
  bossRuleText?: string;
  bastionInterval?: number;
  anomalyText: string;
}

export interface ArcSegment {
  from: { r: number; c: number };
  to: { r: number; c: number };
  isDeflected: boolean;
}

export interface SalvoStepEstimate {
  r: number;
  c: number;
  wire: WireModuleId;
  order: number;
  base: number;
  localMult: number;
  chainMult: number;
  points: number;
}

export interface SalvoBreakdown {
  totalPoints: number;
  totalBase: number;
  avgLocalMult: number;
  startMult: number;
  endMult: number;
  arcCount: number;
  prismCount: number;
  hasPotentialChain: boolean;
  willClearQuota: boolean;
  steps: SalvoStepEstimate[];
}

export type DetonationEvent =
  | {
      kind: 'dud';
      r: number;
      c: number;
      shieldsLeft: number;
    }
  | {
      kind: 'blast';
      r: number;
      c: number;
      blastType: WireModuleId | 'secondary' | 'omega_core';
      chainIndex: number;
      basePts: number;
      localMult: number;
      salvoMult: number;
      finalPts: number;
      isHotspot: boolean;
      hotspotMult?: number;
      isOmegaCore: boolean;
      creditsGained: number;
      movesGained: number;
      shieldsGained: number;
      hitStop: boolean;
      triggeredRelics: { id: RelicId; label: string }[];
    }
  | {
      kind: 'beam';
      r1: number;
      c1: number;
      r2: number;
      c2: number;
      beamStyle: 'arc' | 'prism' | 'cross' | 'omega';
    }
  | {
      kind: 'armor_break';
      r: number;
      c: number;
      points: number;
      credits: number;
      relicTriggered?: RelicId;
    }
  | {
      kind: 'crystal_collect';
      r: number;
      c: number;
      credits: number;
    }
  | {
      kind: 'unscramble';
      r: number;
      c: number;
    }
  | {
      kind: 'relic_trigger';
      relicId: RelicId;
      label: string;
      r?: number;
      c?: number;
    }
  | {
      kind: 'salvo_summary';
      chainCount: number;
      salvoPoints: number;
      salvoCredits: number;
      echoMovesGained: number;
      omegaCoreDestroyed: boolean;
    };

export interface DetonationResolution {
  events: DetonationEvent[];
  chainCount: number;
  salvoPoints: number;
  salvoCredits: number;
  omegaCoreDestroyed: boolean;
  numberDrops: { r: number; c: number; from: number; to: number }[];
  endBoardSnapshot: Cell[][];
}

export type ShopUpgradeId =
  | 'repair_shield'
  | 'max_shield'
  | 'add_c4'
  | 'add_arc'
  | 'add_cross'
  | 'add_amp'
  | 'add_prism'
  | 'add_siphon'
  | 'add_sonar'
  | 'add_moves';

export interface ShopUpgradeDef {
  id: ShopUpgradeId;
  title: string;
  baseCost: number;
  costStep: number;
  maxPurchases?: number;
  iconKey: string;
}

export interface RunRecord {
  bestSector: number;
  bestScore: number;
  bestChain: number;
  runsCompleted: number;
}

export interface ShopSummary {
  baseReward: number;
  moveBonus: number;
  overkillBonus: number;
  totalEarned: number;
}

export interface GameSnapshot {
  seed: string;
  chassisId: ChassisId;
  sector: number;
  config: SectorConfig;
  shields: number;
  maxShields: number;
  credits: number;
  relics: RelicId[];
  baseCharges: ChargeBag;
  charges: ChargeBag;
  bonusMoves: number;
  moves: number;
  movesSinceBastion: number;
  sectorScore: number;
  sectorTarget: number;
  totalScore: number;
  totalMinesDetonated: number;
  maxChain: number;
  board: Cell[][];
  firstClickDone: boolean;
  isDetonating: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  victoryPending: boolean;
  victoryShown: boolean;
  omegaCoreAlive: boolean;
  activeTool: ToolId;
  lastWireTool: WireModuleId;
  surgicalBonusMult: number;
  tutorialMode: boolean;
  tutorialStep: number;
  shopOpen: boolean;
  shopSummary: ShopSummary | null;
  shopRelicChoices: RelicId[];
  relicDraftTaken: boolean;
  shopRerollsUsed: number;
  upgradeCounts: Record<ShopUpgradeId, number>;
}
