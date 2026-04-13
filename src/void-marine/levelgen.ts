import { TILE } from './constants';
import { LEVELS } from './levels';

export type TileType = 'ground' | 'platform' | 'arena_wall';
export type EnemyType = 'grunt' | 'shooter';

export interface TileDef {
  type: TileType;
  x: number;
  y: number;
}

export interface EnemyDef {
  type: EnemyType;
  x: number;
  y: number;
}

export interface PowerupDef {
  type: 'double_jump';
  x: number;
  y: number;
}

export interface LevelData {
  tiles: TileDef[];
  enemies: EnemyDef[];
  powerups: PowerupDef[];
  bossArenaX: number;
}

export function generateLevel(levelIdx: number, hasDoubleJump: boolean): LevelData {
  const L = LEVELS[levelIdx];
  const data: LevelData = { tiles: [], enemies: [], powerups: [], bossArenaX: 0 };
  const levelWidth = L.levelWidth;
  const groundY = 12;
  const ARENA_WIDTH = 25;
  const ARENA_START = levelWidth;
  const POWERUP_X = L.powerupX;

  // ground + pits
  const pitZones: { start: number; end: number; hard: boolean }[] = [];
  let x = 0;
  const hardStart = POWERUP_X ? POWERUP_X + 5 : hasDoubleJump ? 0 : 999;
  while (x < levelWidth) {
    const isHard = x > hardStart;
    if (x > 5 && x < levelWidth - 5 && Math.random() < (isHard ? 0.08 : 0.06)) {
      const last = pitZones[pitZones.length - 1];
      if (!last || x - last.end >= (isHard ? 4 : 5)) {
        const len = (isHard ? 3 : 2) + Math.floor(Math.random() * (isHard ? 3 : 2));
        pitZones.push({ start: x, end: x + len - 1, hard: isHard });
        x += len;
        continue;
      }
    }
    data.tiles.push({ type: 'ground', x, y: groundY });
    data.tiles.push({ type: 'ground', x, y: groundY + 1 });
    x++;
  }

  const PIT_BUF = 2;
  const isNearPit = (tx: number) =>
    pitZones.some((p) => tx >= p.start - PIT_BUF && tx <= p.end + PIT_BUF);

  // fill leading to arena
  for (let tx = levelWidth - 3; tx < ARENA_START; tx++) {
    if (!data.tiles.some((t) => t.x === tx && t.y === groundY)) {
      data.tiles.push({ type: 'ground', x: tx, y: groundY });
      data.tiles.push({ type: 'ground', x: tx, y: groundY + 1 });
    }
  }

  // boss arena
  data.bossArenaX = ARENA_START * TILE;
  for (let ax = ARENA_START; ax < ARENA_START + ARENA_WIDTH; ax++) {
    data.tiles.push({ type: 'ground', x: ax, y: groundY });
    data.tiles.push({ type: 'ground', x: ax, y: groundY + 1 });
  }
  for (let wy = 0; wy <= groundY; wy++)
    data.tiles.push({ type: 'arena_wall', x: ARENA_START + ARENA_WIDTH - 1, y: wy });

  // powerup (only level 1)
  if (POWERUP_X && !hasDoubleJump) {
    let puX = POWERUP_X;
    while (!data.tiles.some((t) => t.x === puX && t.y === groundY) && puX < POWERUP_X + 10)
      puX++;
    data.powerups.push({
      type: 'double_jump',
      x: puX * TILE + TILE / 2,
      y: (groundY - 2) * TILE,
    });
  }

  // platforms
  for (let px = 8; px < levelWidth - 5; px += 5 + Math.floor(Math.random() * 7)) {
    const isHard = px > hardStart;
    const platY =
      isHard && Math.random() < 0.35
        ? groundY - 6 - Math.floor(Math.random() * 2)
        : groundY - 3 - Math.floor(Math.random() * 3);
    const platLen = 3 + Math.floor(Math.random() * 4);
    let blocked = false;
    for (let i = 0; i < platLen; i++) {
      if (isNearPit(px + i)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (let i = 0; i < platLen; i++)
      data.tiles.push({ type: 'platform', x: px + i, y: platY });
    if (Math.random() < 0.5)
      data.enemies.push({
        type: Math.random() < 0.4 ? 'shooter' : 'grunt',
        x: (px + 1) * TILE,
        y: (platY - 1) * TILE,
      });
  }

  // stepping stones over hard pits
  pitZones.forEach((pit) => {
    if (pit.hard && pit.end - pit.start >= 3) {
      const mid = Math.floor((pit.start + pit.end) / 2);
      const sy = groundY - 5 - Math.floor(Math.random() * 2);
      data.tiles.push({ type: 'platform', x: mid, y: sy });
      data.tiles.push({ type: 'platform', x: mid + 1, y: sy });
    }
  });

  // ground enemies
  for (let gx = 10; gx < levelWidth - 3; gx += 4 + Math.floor(Math.random() * 6)) {
    if (data.tiles.some((t) => t.x === gx && t.y === groundY) && !isNearPit(gx))
      data.enemies.push({
        type: Math.random() < (gx > hardStart ? 0.5 : 0.3) ? 'shooter' : 'grunt',
        x: gx * TILE,
        y: (groundY - 1) * TILE,
      });
  }

  return data;
}
