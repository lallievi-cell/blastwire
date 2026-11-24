import type { ShopUpgradeDef, ShopUpgradeId } from '../types/game';

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  {
    id: 'repair_shield',
    title: 'Ripara Scudo (+1)',
    baseCost: 45,
    costStep: 10,
    iconKey: 'shield',
  },
  {
    id: 'max_shield',
    title: 'Corazza Extra (+1 Max)',
    baseCost: 95,
    costStep: 35,
    maxPurchases: 3,
    iconKey: 'armor_plus',
  },
  {
    id: 'add_c4',
    title: '+2 C4 Base / sett.',
    baseCost: 45,
    costStep: 20,
    iconKey: 'c4',
  },
  {
    id: 'add_arc',
    title: '+1 Ponte Arco / sett.',
    baseCost: 65,
    costStep: 25,
    iconKey: 'arc',
  },
  {
    id: 'add_cross',
    title: '+1 Carica Croce / sett.',
    baseCost: 70,
    costStep: 25,
    iconKey: 'cross',
  },
  {
    id: 'add_amp',
    title: '+1 Amplificatore / sett.',
    baseCost: 85,
    costStep: 35,
    iconKey: 'amp',
  },
  {
    id: 'add_prism',
    title: '+1 Deviascintilla / sett.',
    baseCost: 60,
    costStep: 25,
    iconKey: 'prism',
  },
  {
    id: 'add_siphon',
    title: '+1 Estrattore / sett.',
    baseCost: 55,
    costStep: 20,
    iconKey: 'siphon',
  },
  {
    id: 'add_sonar',
    title: '+1 Sonar / sett.',
    baseCost: 55,
    costStep: 25,
    iconKey: 'sonar',
  },
  {
    id: 'add_moves',
    title: '+4 Mosse Base / sett.',
    baseCost: 50,
    costStep: 20,
    iconKey: 'dig',
  },
];

export function getUpgradeCost(def: ShopUpgradeDef, timesBought: number): number {
  return def.baseCost + def.costStep * timesBought;
}

export function getRerollCost(rerollsUsed: number): number {
  return 30 + rerollsUsed * 15;
}

export function createInitialUpgradeCounts(): Record<ShopUpgradeId, number> {
  return {
    repair_shield: 0,
    max_shield: 0,
    add_c4: 0,
    add_arc: 0,
    add_cross: 0,
    add_amp: 0,
    add_prism: 0,
    add_siphon: 0,
    add_sonar: 0,
    add_moves: 0,
  };
}
