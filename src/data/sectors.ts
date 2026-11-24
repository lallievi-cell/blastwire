import type { BiomeId, SectorConfig } from '../types/game';

const CAMPAIGN_SECTORS: SectorConfig[] = [
  {
    sector: 1,
    title: 'Fonderia 01',
    biome: 'industrial',
    biomeLabel: 'Scavo Iniziale',
    rows: 7,
    cols: 7,
    mines: 9,
    target: 300,
    moves: 18,
    hotspots: 2,
    anomaly: 'none',
    isBoss: false,
    anomalyText: 'Zona d’oro ⬡ = punti doppi!',
  },
  {
    sector: 2,
    title: 'Miniere di Quarzo',
    biome: 'quartz',
    biomeLabel: 'Vena Cristallina',
    rows: 8,
    cols: 8,
    mines: 13,
    target: 620,
    moves: 21,
    hotspots: 3,
    anomaly: 'crystals',
    isBoss: false,
    anomalyText: 'Cristalli ◆: +40 monete (o +55 se su mina)',
  },
  {
    sector: 3,
    title: 'Forgia del Bastione',
    biome: 'forge',
    biomeLabel: 'Boss · Settore 3',
    rows: 8,
    cols: 8,
    mines: 16,
    target: 1050,
    moves: 24,
    hotspots: 3,
    anomaly: 'bastion',
    isBoss: true,
    bossName: 'BOSS · IL BASTIONE',
    bossRuleText: 'Ogni 4 scavi blinda 2 caselle. Spaccale con Croce o Fulmine!',
    bastionInterval: 4,
    anomalyText: 'BOSS · Blinda 2 caselle ogni 4 scavi',
  },
  {
    sector: 4,
    title: 'Bunker Blindato',
    biome: 'bunker',
    biomeLabel: 'Piastre Corazzate',
    rows: 9,
    cols: 9,
    mines: 20,
    target: 1650,
    moves: 27,
    hotspots: 3,
    anomaly: 'armor',
    isBoss: false,
    anomalyText: 'Piastre blindate: rompibili solo con esplosioni',
  },
  {
    sector: 5,
    title: 'Tempesta Radio',
    biome: 'emp',
    biomeLabel: 'Interferenza EMP',
    rows: 10,
    cols: 10,
    mines: 24,
    target: 2400,
    moves: 31,
    hotspots: 4,
    anomaly: 'scramble',
    isBoss: false,
    anomalyText: 'I numeri "?" si sbloccano se colpiti da un’esplosione',
  },
  {
    sector: 6,
    title: 'Cuore del Reattore',
    biome: 'omega',
    biomeLabel: 'Boss Finale',
    rows: 10,
    cols: 10,
    mines: 28,
    target: 3400,
    moves: 36,
    hotspots: 4,
    anomaly: 'omega',
    isBoss: true,
    bossName: 'BOSS FINALE · NUCLEO OMEGA',
    bossRuleText: 'Fai esplodere il Nucleo rosso per vincere il settore (+600 pt base)!',
    anomalyText: 'BOSS · Distruggi il Nucleo rosso e batti l’obiettivo!',
  },
];

const ENDLESS_BIOMES: { biome: BiomeId; label: string; anomaly: 'bastion' | 'omega' | 'scramble' }[] = [
  { biome: 'forge', label: 'Forgia Infinita', anomaly: 'bastion' },
  { biome: 'emp', label: 'Tempesta Infinita', anomaly: 'scramble' },
  { biome: 'omega', label: 'Reattore Infinito', anomaly: 'omega' },
];

export function getSectorConfig(sectorNum: number): SectorConfig {
  if (sectorNum >= 1 && sectorNum <= CAMPAIGN_SECTORS.length) {
    return { ...CAMPAIGN_SECTORS[sectorNum - 1] };
  }
  const extra = Math.max(1, sectorNum - CAMPAIGN_SECTORS.length);
  const rot = ENDLESS_BIOMES[(extra - 1) % ENDLESS_BIOMES.length];
  const isOmega = rot.anomaly === 'omega';
  const isBastion = rot.anomaly === 'bastion';
  return {
    sector: sectorNum,
    title: `Abisso ${sectorNum}`,
    biome: rot.biome,
    biomeLabel: rot.label,
    rows: 10,
    cols: 10,
    mines: Math.min(40, 28 + extra * 2),
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
      ? 'Distruggi il Nucleo rosso e supera l’obiettivo!'
      : isBastion
        ? 'Ogni 4 scavi blinda 2 caselle.'
        : undefined,
    bastionInterval: isBastion ? 4 : undefined,
    anomalyText: isOmega
      ? `Abisso ${sectorNum} · Nucleo Omega attivo`
      : isBastion
        ? `Abisso ${sectorNum} · Corazza ogni 4 scavi`
        : `Abisso ${sectorNum} · Tempesta EMP + Cristalli`,
  };
}
