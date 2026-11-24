import type { BiomeId, SectorConfig } from '../types/game';

const CAMPAIGN_SECTORS: SectorConfig[] = [
  {
    sector: 1,
    title: 'Cantiere 01',
    biome: 'industrial',
    biomeLabel: 'Acciaio Industriale',
    rows: 7,
    cols: 7,
    mines: 9,
    target: 300,
    moves: 18,
    hotspots: 2,
    anomaly: 'none',
    isBoss: false,
    anomalyText: 'Griglia nominale · Ordina #1→#N e detona',
  },
  {
    sector: 2,
    title: 'Vena Quarzo',
    biome: 'quartz',
    biomeLabel: 'Giacimento Minerario',
    rows: 8,
    cols: 8,
    mines: 13,
    target: 620,
    moves: 21,
    hotspots: 3,
    anomaly: 'crystals',
    isBoss: false,
    anomalyText: 'Vena Cristallina: ◆ su celle sicure (+40 ₡) o mine (+55 ₡ al blast).',
  },
  {
    sector: 3,
    title: 'Forgia Bastione',
    biome: 'forge',
    biomeLabel: 'Forgia Termica',
    rows: 8,
    cols: 8,
    mines: 16,
    target: 1050,
    moves: 24,
    hotspots: 3,
    anomaly: 'bastion',
    isBoss: true,
    bossName: 'BOSS S3 · IL BASTIONE',
    bossRuleText: 'Ogni 4 mosse di scavo corazzatura su 2 celle coperte. Frantumale con Croce o Arco!',
    bastionInterval: 4,
    anomalyText: 'BOSS S3 · Ogni 4 mosse di scavo, 2 celle diventano corazzate.',
  },
  {
    sector: 4,
    title: 'Bunker Blindato',
    biome: 'bunker',
    biomeLabel: 'Settore Corazzato',
    rows: 9,
    cols: 9,
    mines: 20,
    target: 1650,
    moves: 27,
    hotspots: 3,
    anomaly: 'armor',
    isBoss: false,
    anomalyText: 'Placche Corazzate & Cristalli · Usa Croci o Archi per aprire varchi.',
  },
  {
    sector: 5,
    title: 'Stazione EMP',
    biome: 'emp',
    biomeLabel: 'Tempesta Elettromagnetica',
    rows: 10,
    cols: 10,
    mines: 24,
    target: 2400,
    moves: 31,
    hotspots: 4,
    anomaly: 'scramble',
    isBoss: false,
    anomalyText: 'Tempesta EMP: i numeri ? si decriptano se sfiorati da un’esplosione.',
  },
  {
    sector: 6,
    title: 'Reattore Omega',
    biome: 'omega',
    biomeLabel: 'Nucleo Cremisi',
    rows: 10,
    cols: 10,
    mines: 28,
    target: 3400,
    moves: 36,
    hotspots: 4,
    anomaly: 'omega',
    isBoss: true,
    bossName: 'BOSS FINALE · NUCLEO OMEGA',
    bossRuleText: 'Distruggi la mina NUCLEO (☢) per sbloccare il completamento del settore (+600 pt base!).',
    anomalyText: 'BOSS S6 · Detona il Nucleo Omega (☢) e supera la Quota!',
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
    title: `Infinito S${sectorNum}`,
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
      ? `INFINITO S${sectorNum} · NUCLEO OMEGA`
      : isBastion
        ? `INFINITO S${sectorNum} · BASTIONE`
        : undefined,
    bossRuleText: isOmega
      ? 'Distruggi il Nucleo Omega (☢) e sfonda la Quota!'
      : isBastion
        ? 'Ogni 4 mosse di scavo, 2 celle ricevono una corazza.'
        : undefined,
    bastionInterval: isBastion ? 4 : undefined,
    anomalyText: isOmega
      ? `MODALITÀ INFINITA S${sectorNum} · Nucleo Omega attivo`
      : isBastion
        ? `MODALITÀ INFINITA S${sectorNum} · Bastione (corazza ogni 4 mosse)`
        : `MODALITÀ INFINITA S${sectorNum} · Tempesta EMP + Cristalli`,
  };
}
