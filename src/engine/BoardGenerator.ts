import type { Cell, LayoutPattern, SectorConfig } from '../types/game';
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
        wall: false,
        barrel: false,
        bastionTarget: false,
        isMine: false,
        omegaCore: false,
        omegaShield: false,
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

/**
 * Stamps recognizable architectural walls/pillars onto a board BEFORE first click
 * so the player sees the room layout immediately and chooses where to open!
 */
export function applyLayoutWalls(board: Cell[][], layout: LayoutPattern): void {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const setWall = (r: number, c: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      board[r][c].wall = true;
    }
  };

  if (layout === 'open') return;

  if (layout === 'pillars') {
    // 4 symmetric corner-inset pillars -> rewards Specchio (Prism) routing!
    const r1 = Math.floor(rows / 3);
    const r2 = rows - 1 - r1;
    const c1 = Math.floor(cols / 3);
    const c2 = cols - 1 - c1;
    setWall(r1, c1);
    setWall(r1, c2);
    setWall(r2, c1);
    setWall(r2, c2);
    return;
  }

  if (layout === 'vault') {
    // 4 corner bastion blocks + 2 central dividers
    setWall(0, 0);
    setWall(0, cols - 1);
    setWall(rows - 1, 0);
    setWall(rows - 1, cols - 1);
    const midR = Math.floor(rows / 2);
    setWall(midR, 2);
    setWall(midR, cols - 3);
    return;
  }

  if (layout === 'corridors') {
    // Two broken horizontal steel bulkheads with gaps
    const rTop = Math.floor(rows / 3);
    const rBot = rows - 1 - rTop;
    for (let c = 1; c < cols - 1; c++) {
      if (c === Math.floor(cols / 2) || c === Math.floor(cols / 2) - 1) continue;
      if (c % 2 === 1) setWall(rTop, c);
      if (c % 2 === 0) setWall(rBot, c);
    }
    return;
  }

  if (layout === 'crossroads') {
    // 4 short inner cross walls leaving wide central intersection
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    setWall(1, midC);
    setWall(rows - 2, midC);
    setWall(midR, 1);
    setWall(midR, cols - 2);
    return;
  }

  if (layout === 'reactor') {
    // Octagonal reactor chamber corners + 4 inner cooling pylons
    setWall(0, 0);
    setWall(0, cols - 1);
    setWall(rows - 1, 0);
    setWall(rows - 1, cols - 1);
    setWall(2, 2);
    setWall(2, cols - 3);
    setWall(rows - 3, 2);
    setWall(rows - 3, cols - 3);
  }
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
      const cell = board[r][c];
      if (cell.wall) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      candidates.push(cell);
    }
  }
  rng.shuffle(candidates);

  // 1. Place mines
  const mineCount = Math.min(cfg.mines, candidates.length);
  for (let i = 0; i < mineCount; i++) {
    candidates[i].isMine = true;
  }

  // 2. Boss S6 / Omega Core: visibly marked 2-phase boss mine
  if (cfg.anomaly === 'omega' && mineCount > 0) {
    const interiorMines = candidates
      .slice(0, mineCount)
      .filter((t) => t.r > 1 && t.r < rows - 2 && t.c > 1 && t.c < cols - 2);
    const coreCell =
      interiorMines.length > 0 ? interiorMines[0] : candidates[0];
    coreCell.omegaCore = true;
    coreCell.omegaShield = true;
  }

  // 3. Place Seismic Hotspots (mix of mine & non-mine so zero leak!)
  const hsCount = cfg.hotspots || 2;
  const hsPool = rng.shuffle([...candidates]);
  let hsPlaced = 0;
  const normalMine = candidates.slice(0, mineCount).find((t) => !t.omegaCore);
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

  // 4. Place Interactive Gas Barrels on safe non-hotspot tiles (visible chain catalysts!)
  const barrelCount = cfg.barrels || 0;
  if (barrelCount > 0) {
    const barrelPool = rng.shuffle(
      candidates
        .slice(mineCount)
        .filter(
          (t) =>
            !t.hotspot &&
            (Math.abs(t.r - safeR) > 2 || Math.abs(t.c - safeC) > 2),
        ),
    );
    for (let i = 0; i < Math.min(barrelCount, barrelPool.length); i++) {
      barrelPool[i].barrel = true;
    }
  }

  // 5. Place Crystals UNIFORMLY across mines and safe cells (ZERO mine-location leak!)
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
      if (!tile.omegaCore && !tile.hotspot && !tile.barrel) {
        tile.crystal = true;
        placed++;
      }
    }
  }

  // 6. Place Armored Plates outside the 5x5 breathing ring around first click
  if (cfg.anomaly === 'armor' || cfg.anomaly === 'omega' || cfg.anomaly === 'bastion') {
    const armCount =
      cfg.anomaly === 'omega' ? 5 : cfg.anomaly === 'bastion' ? 3 : 6;
    const outerSafe = candidates
      .slice(mineCount)
      .filter(
        (t) =>
          !t.crystal &&
          !t.hotspot &&
          !t.barrel &&
          (Math.abs(t.r - safeR) > 2 || Math.abs(t.c - safeC) > 2),
      );
    const armPool = rng.shuffle(outerSafe);
    for (let i = 0; i < Math.min(armCount, armPool.length); i++) {
      armPool[i].armored = true;
    }
  }

  // 7. Place EMP Scramble tiles
  if (cfg.anomaly === 'scramble' || cfg.anomaly === 'omega') {
    const maxScr = cfg.anomaly === 'omega' ? 4 : 6;
    const scrPool = rng.shuffle(
      candidates.slice(mineCount).filter((t) => !t.armored && !t.barrel),
    );
    for (let i = 0; i < Math.min(maxScr, scrPool.length); i++) {
      scrPool[i].scrambled = true;
    }
  }

  recalculateCounts(board, false);
}

/**
 * Telegraphs up to `count` covered non-mine tiles that Il Bastione will armor next.
 * Players can counterplay by digging them before the countdown hits 0!
 */
export function selectBastionTargets(
  board: Cell[][],
  count: number,
  rng: SeededRng,
): { r: number; c: number }[] {
  const eligible: Cell[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      cell.bastionTarget = false;
      if (
        !cell.revealed &&
        !cell.wall &&
        !cell.barrel &&
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
    cell.bastionTarget = true;
  }
  return picked.map((c) => ({ r: c.r, c: c.c }));
}

/**
 * Converts surviving telegraphed `bastionTarget` tiles into Armored Plates,
 * then immediately telegraphs the next wave!
 */
export function executeBastionArmor(
  board: Cell[][],
  rng: SeededRng,
): { r: number; c: number }[] {
  const armored: { r: number; c: number }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell.bastionTarget && !cell.revealed && !cell.wire && !cell.armored) {
        cell.bastionTarget = false;
        cell.armored = true;
        cell.pinned = false;
        armored.push({ r: cell.r, c: cell.c });
      } else {
        cell.bastionTarget = false;
      }
    }
  }
  selectBastionTargets(board, 2, rng.fork('next-targets'));
  return armored;
}
