import type {
  BiomeId,
  LayoutPattern,
  RouteContract,
  SectorConfig,
} from '../types/game';
import type { SeededRng } from '../engine/prng';

export const LAYOUT_LABELS: Record<LayoutPattern, string> = {
  open: 'Arena Aperta',
  pillars: 'Sala dei Pilastri',
  crossroads: 'Incrocio Blindato',
  vault: 'Camera Centrale',
  corridors: 'Gallerie Parallele',
  reactor: 'Anello Reattore',
};

const CAMPAIGN_SECTORS: SectorConfig[] = [
  {
    sector: 1,
    title: 'Fonderia 01',
    biome: 'industrial',
    biomeLabel: 'Scavo Iniziale',
    layout: 'open',
    rows: 7,
    cols: 7,
    mines: 9,
    barrels: 1,
    target: 300,
    moves: 18,
    hotspots: 2,
    anomaly: 'none',
    isBoss: false,
    anomalyText: 'Zona d’oro ⬡ = ×2 · Barili = onda 3×3!',
  },
  {
    sector: 2,
    title: 'Miniere di Quarzo',
    biome: 'quartz',
    biomeLabel: 'Vena Cristallina',
    layout: 'pillars',
    rows: 8,
    cols: 8,
    mines: 13,
    barrels: 2,
    target: 620,
    moves: 21,
    hotspots: 3,
    anomaly: 'crystals',
    isBoss: false,
    anomalyText: 'Pilastri + Cristalli ◆ (+40/+55 ₡)',
  },
  {
    sector: 3,
    title: 'Forgia del Bastione',
    biome: 'forge',
    biomeLabel: 'Boss · Settore 3',
    layout: 'vault',
    rows: 8,
    cols: 8,
    mines: 16,
    barrels: 2,
    target: 1050,
    moves: 24,
    hotspots: 3,
    anomaly: 'bastion',
    isBoss: true,
    bossName: 'BOSS · IL BASTIONE',
    bossRuleText: 'Ogni 4 scavi blinda le 2 caselle col mirino: scavale prima per fermarlo!',
    bastionInterval: 4,
    anomalyText: 'BOSS · Blinda le caselle col mirino ogni 4 scavi',
  },
  {
    sector: 4,
    title: 'Bunker Blindato',
    biome: 'bunker',
    biomeLabel: 'Piastre Corazzate',
    layout: 'corridors',
    rows: 9,
    cols: 9,
    mines: 20,
    barrels: 3,
    target: 1650,
    moves: 27,
    hotspots: 3,
    anomaly: 'armor',
    isBoss: false,
    anomalyText: 'Gallerie + Corazze: usa Croce, Fulmine e Barili',
  },
  {
    sector: 5,
    title: 'Tempesta Radio',
    biome: 'emp',
    biomeLabel: 'Interferenza EMP',
    layout: 'crossroads',
    rows: 10,
    cols: 10,
    mines: 24,
    barrels: 3,
    target: 2400,
    moves: 31,
    hotspots: 4,
    anomaly: 'scramble',
    isBoss: false,
    anomalyText: 'I numeri "?" si sbloccano con qualsiasi esplosione',
  },
  {
    sector: 6,
    title: 'Cuore del Reattore',
    biome: 'omega',
    biomeLabel: 'Boss Finale',
    layout: 'reactor',
    rows: 10,
    cols: 10,
    mines: 28,
    barrels: 3,
    target: 3400,
    moves: 36,
    hotspots: 4,
    anomaly: 'omega',
    isBoss: true,
    bossName: 'BOSS FINALE · NUCLEO OMEGA',
    bossRuleText: 'Nucleo a 2 Fasi: rompi lo scudo (o fai una combo ×2/4+ mine) e distruggilo!',
    anomalyText: 'BOSS · Rompi lo scudo del Nucleo rosso e distruggilo!',
  },
];

const ENDLESS_BIOMES: {
  biome: BiomeId;
  label: string;
  anomaly: 'bastion' | 'omega' | 'scramble';
  layout: LayoutPattern;
}[] = [
  { biome: 'forge', label: 'Forgia Infinita', anomaly: 'bastion', layout: 'vault' },
  { biome: 'emp', label: 'Tempesta Infinita', anomaly: 'scramble', layout: 'crossroads' },
  { biome: 'omega', label: 'Reattore Infinito', anomaly: 'omega', layout: 'reactor' },
];

export function getSectorConfig(
  sectorNum: number,
  route?: RouteContract | null,
): SectorConfig {
  let base: SectorConfig;
  if (sectorNum >= 1 && sectorNum <= CAMPAIGN_SECTORS.length) {
    base = { ...CAMPAIGN_SECTORS[sectorNum - 1] };
  } else {
    const extra = Math.max(1, sectorNum - CAMPAIGN_SECTORS.length);
    const rot = ENDLESS_BIOMES[(extra - 1) % ENDLESS_BIOMES.length];
    const isOmega = rot.anomaly === 'omega';
    const isBastion = rot.anomaly === 'bastion';
    base = {
      sector: sectorNum,
      title: `Abisso ${sectorNum}`,
      biome: rot.biome,
      biomeLabel: rot.label,
      layout: rot.layout,
      rows: 10,
      cols: 10,
      mines: Math.min(40, 28 + extra * 2),
      barrels: 3,
      target: 3400 + extra * 1250,
      moves: 36 + extra * 2,
      hotspots: 5,
      anomaly: rot.anomaly,
      isBoss: isOmega || isBastion,
      bossName: isOmega
        ? `ABISSO ${sectorNum} · NUCLEO OMEGA`
        : isBastion
          ? `ABISSO ${sectorNum} · BASTIONE`
          : undefined,
      bossRuleText: isOmega
        ? 'Distruggi il Nucleo rosso a 2 fasi e batti l’obiettivo!'
        : isBastion
          ? 'Ogni 4 scavi blinda le 2 caselle col mirino.'
          : undefined,
      bastionInterval: isBastion ? 4 : undefined,
      anomalyText: isOmega
        ? `Abisso ${sectorNum} · Nucleo Omega a 2 fasi`
        : isBastion
          ? `Abisso ${sectorNum} · Bastione ogni 4 scavi`
          : `Abisso ${sectorNum} · Tempesta EMP + Barili`,
    };
  }

  if (route) {
    base.layout = route.layout;
    base.mines = Math.min(42, base.mines + route.extraMines);
    base.barrels = base.barrels + route.extraBarrels;
    base.hotspots = base.hotspots + route.extraHotspots;
    base.target = Math.round((base.target * route.targetMult) / 10) * 10;
    base.bonusCredits = (base.bonusCredits ?? 0) + route.bonusCredits;
    base.title = `${base.title} · ${route.title}`;
  }

  return base;
}

const ROUTE_TEMPLATES: Omit<RouteContract, 'id'>[] = [
  {
    title: 'Deposito Gas',
    layout: 'pillars',
    layoutLabel: 'Sala Pilastri',
    perkLabel: '+3 Barili di Gas',
    riskLabel: '+2 Mine',
    accent: 'ember',
    extraMines: 2,
    extraBarrels: 3,
    extraHotspots: 0,
    targetMult: 1.0,
    bonusCredits: 25,
  },
  {
    title: 'Vena d’Oro',
    layout: 'corridors',
    layoutLabel: 'Gallerie Parallele',
    perkLabel: '+2 Caselle d’Oro · +45 ₡',
    riskLabel: '+15% Obiettivo',
    accent: 'amber',
    extraMines: 1,
    extraBarrels: 0,
    extraHotspots: 2,
    targetMult: 1.15,
    bonusCredits: 45,
  },
  {
    title: 'Incrocio Elettrico',
    layout: 'crossroads',
    layoutLabel: 'Incrocio',
    perkLabel: '+1 Barile · +65 ₡ Bonus',
    riskLabel: '+3 Mine',
    accent: 'cyan',
    extraMines: 3,
    extraBarrels: 1,
    extraHotspots: 1,
    targetMult: 1.08,
    bonusCredits: 65,
  },
  {
    title: 'Accesso Sicuro',
    layout: 'open',
    layoutLabel: 'Arena Aperta',
    perkLabel: 'Nessun muro · Obiettivo standard',
    riskLabel: 'Nessun extra',
    accent: 'emerald',
    extraMines: 0,
    extraBarrels: 1,
    extraHotspots: 0,
    targetMult: 1.0,
    bonusCredits: 0,
  },
];

export function rollRouteContracts(
  nextSector: number,
  rng: SeededRng,
): RouteContract[] {
  // Final Boss Sector 6 always goes directly into Cuore del Reattore
  if (nextSector === 6) return [];
  const pool = rng.shuffle([...ROUTE_TEMPLATES]);
  return pool.slice(0, 2).map((tpl, idx) => ({
    ...tpl,
    id: `route-${nextSector}-${idx}`,
  }));
}
