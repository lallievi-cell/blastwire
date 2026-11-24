import type { Cell, SectorConfig } from '../types/game';
import { recalculateCounts } from './MinesweeperLogic';
import type { SeededRng } from './prng';

export function createEmptyBoard(rows: number, cols: number): Cell[][] {
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        isMine: false,
        omegaCore: false,
        revealed: false,
        crater: false,
        armored: false,
        crystal: false,
        hotspot: false,
        scrambled: false,
        sonarPing: false,
        pinned: false,
        wire: null,
        wireOrder: 0,
        adjMines: 0,
        prevAdjMines: null,
      });
    }
    board.push(row);
  }
  return board;
}

export function populateMinesAndAnomalies(
  board: Cell[][],
  cfg: SectorConfig,
  safeR: number,
  safeC: number,
  rng: SeededRng,
): void {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  const candidates: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      candidates.push(board[r][c]);
    }
  }
  rng.shuffle(candidates);

  // 1. Place mines
  const mineCount = Math.min(cfg.mines, candidates.length);
  for (let i = 0; i < mineCount; i++) {
    candidates[i].isMine = true;
  }

  // 2. Boss S6 / Omega Core: visibly marked high-value boss mine
  if (cfg.anomaly === 'omega' && mineCount > 0) {
    // Prefer an interior mine for geometric playability
    const interiorMines = candidates
      .slice(0, mineCount)
      .filter((t) => t.r > 0 && t.r < rows - 1 && t.c > 0 && t.c < cols - 1);
    const coreCell =
      interiorMines.length > 0 ? interiorMines[0] : candidates[0];
    coreCell.omegaCore = true;
  }

  // 3. Place Seismic Hotspots (mix of mine & non-mine so zero leak!)
  const hsCount = cfg.hotspots || 2;
  const hsPool = rng.shuffle([...candidates]);
  let hsPlaced = 0;
  // Guarantee at least 1 hotspot on a normal mine so sectors always have a juicy target
  const normalMine = candidates
    .slice(0, mineCount)
    .find((t) => !t.omegaCore);
  if (normalMine) {
    normalMine.hotspot = true;
    hsPlaced++;
  }
  for (const tile of hsPool) {
    if (hsPlaced >= hsCount) break;
    if (!tile.hotspot && !tile.omegaCore) {
      tile.hotspot = true;
      hsPlaced++;
    }
  }

  // 4. Place Crystals UNIFORMLY across mines and safe cells (ZERO mine-location leak!)
  if (
    cfg.anomaly === 'crystals' ||
    cfg.anomaly === 'armor' ||
    cfg.anomaly === 'scramble' ||
    cfg.anomaly === 'omega'
  ) {
    const crysCount = cfg.anomaly === 'crystals' ? 6 : cfg.anomaly === 'omega' ? 5 : 4;
    const crysPool = rng.shuffle([...candidates]);
    let placed = 0;
    for (const tile of crysPool) {
      if (placed >= crysCount) break;
      if (!tile.omegaCore && !tile.hotspot) {
        tile.crystal = true;
        placed++;
      }
    }
  }

  // 5. Place Armored Plates (never on mines/omega/hotspots so mines stay wireable; armor blocks sight & digs)
  if (cfg.anomaly === 'armor' || cfg.anomaly === 'omega' || cfg.anomaly === 'bastion') {
    const armCount =
      cfg.anomaly === 'omega' ? 5 : cfg.anomaly === 'bastion' ? 3 : 6;
    const armPool = rng.shuffle(
      candidates.slice(mineCount).filter((t) => !t.crystal && !t.hotspot),
    );
    for (let i = 0; i < Math.min(armCount, armPool.length); i++) {
      armPool[i].armored = true;
    }
  }

  // 6. Place EMP Scramble tiles (safe numbered cells that show '?' until hit by blast wave)
  if (cfg.anomaly === 'scramble' || cfg.anomaly === 'omega') {
    const maxScr = cfg.anomaly === 'omega' ? 4 : 6;
    const scrPool = rng.shuffle(
      candidates.slice(mineCount).filter((t) => !t.armored),
    );
    for (let i = 0; i < Math.min(maxScr, scrPool.length); i++) {
      scrPool[i].scrambled = true;
    }
  }

  recalculateCounts(board, false);
}

/**
 * Active Boss S3 (Il Bastione) tick:
 * Reinforces up to `count` covered, un-wired, non-mine safe tiles with Armored Plates.
 */
export function applyBastionArmor(
  board: Cell[][],
  count: number,
  rng: SeededRng,
): { r: number; c: number }[] {
  const eligible: Cell[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (
        !cell.revealed &&
        !cell.armored &&
        !cell.wire &&
        !cell.isMine &&
        !cell.omegaCore &&
        !cell.hotspot
      ) {
        eligible.push(cell);
      }
    }
  }
  rng.shuffle(eligible);
  const picked = eligible.slice(0, count);
  for (const cell of picked) {
    cell.armored = true;
    cell.pinned = false;
  }
  return picked.map((c) => ({ r: c.r, c: c.c }));
}
