import type { ChassisId, RunRecord } from '../types/game';

const RECORD_KEY = 'blastwire_v3_records';
const PREFS_KEY = 'blastwire_v3_prefs';

export interface UserPreferences {
  muted: boolean;
  animSpeed: 1 | 2;
  chassisId: ChassisId;
}

export function loadRecord(): RunRecord {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    if (!raw) return { bestSector: 0, bestScore: 0, bestChain: 0, runsCompleted: 0 };
    const parsed = JSON.parse(raw) as Partial<RunRecord>;
    return {
      bestSector: parsed.bestSector ?? 0,
      bestScore: parsed.bestScore ?? 0,
      bestChain: parsed.bestChain ?? 0,
      runsCompleted: parsed.runsCompleted ?? 0,
    };
  } catch {
    return { bestSector: 0, bestScore: 0, bestChain: 0, runsCompleted: 0 };
  }
}

export function saveRecord(
  sector: number,
  score: number,
  chain: number,
  campaignCleared = false,
): RunRecord {
  const prev = loadRecord();
  const next: RunRecord = {
    bestSector: Math.max(prev.bestSector, sector),
    bestScore: Math.max(prev.bestScore, score),
    bestChain: Math.max(prev.bestChain, chain),
    runsCompleted: prev.runsCompleted + (campaignCleared ? 1 : 0),
  };
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable
  }
  return next;
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { muted: false, animSpeed: 1, chassisId: 'demolisher' };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      muted: Boolean(parsed.muted),
      animSpeed: parsed.animSpeed === 2 ? 2 : 1,
      chassisId:
        parsed.chassisId === 'tesla' || parsed.chassisId === 'surgeon'
          ? parsed.chassisId
          : 'demolisher',
    };
  } catch {
    return { muted: false, animSpeed: 1, chassisId: 'demolisher' };
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): UserPreferences {
  const merged: UserPreferences = { ...loadPreferences(), ...prefs };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch {
    // storage unavailable
  }
  return merged;
}
