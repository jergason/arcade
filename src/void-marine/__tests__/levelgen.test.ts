import { describe, it, expect, beforeEach } from 'vitest';
import { generateLevel, type LevelData } from '../levelgen';
import { TILE } from '../constants';
import { LEVELS } from '../levels';

describe('generateLevel', () => {
  let level0: LevelData;
  let level1: LevelData;
  let level2: LevelData;

  beforeEach(() => {
    level0 = generateLevel(0, false);
    level1 = generateLevel(1, true);
    level2 = generateLevel(2, true);
  });

  it('returns tiles, enemies, powerups, and bossArenaX', () => {
    [level0, level1, level2].forEach((l) => {
      expect(Array.isArray(l.tiles)).toBe(true);
      expect(Array.isArray(l.enemies)).toBe(true);
      expect(Array.isArray(l.powerups)).toBe(true);
      expect(typeof l.bossArenaX).toBe('number');
    });
  });

  it('generates a non-trivial number of tiles', () => {
    [level0, level1, level2].forEach((l) => {
      expect(l.tiles.length).toBeGreaterThan(100);
    });
  });

  it('includes ground tiles at y=12', () => {
    [level0, level1, level2].forEach((l) => {
      const groundTiles = l.tiles.filter((t) => t.type === 'ground' && t.y === 12);
      expect(groundTiles.length).toBeGreaterThan(50);
    });
  });

  it('includes arena wall tiles', () => {
    [level0, level1, level2].forEach((l) => {
      const walls = l.tiles.filter((t) => t.type === 'arena_wall');
      expect(walls.length).toBeGreaterThan(0);
    });
  });

  it('boss arena X is at levelWidth * TILE', () => {
    LEVELS.forEach((L, i) => {
      const data = generateLevel(i, false);
      expect(data.bossArenaX).toBe(L.levelWidth * TILE);
    });
  });

  it('generates enemies', () => {
    [level0, level1, level2].forEach((l) => {
      expect(l.enemies.length).toBeGreaterThan(0);
    });
  });

  it('enemy types are grunt or shooter', () => {
    [level0, level1, level2].forEach((l) => {
      l.enemies.forEach((e) => {
        expect(['grunt', 'shooter']).toContain(e.type);
      });
    });
  });

  it('tile types are ground, platform, or arena_wall', () => {
    [level0, level1, level2].forEach((l) => {
      l.tiles.forEach((t) => {
        expect(['ground', 'platform', 'arena_wall']).toContain(t.type);
      });
    });
  });

  it('places double_jump powerup on level 0 when player lacks it', () => {
    const data = generateLevel(0, false);
    expect(data.powerups.length).toBe(1);
    expect(data.powerups[0].type).toBe('double_jump');
  });

  it('does not place powerup on level 0 if player already has double jump', () => {
    const data = generateLevel(0, true);
    expect(data.powerups.length).toBe(0);
  });

  it('does not place powerup on levels without powerupX', () => {
    const data1 = generateLevel(1, false);
    const data2 = generateLevel(2, false);
    expect(data1.powerups.length).toBe(0);
    expect(data2.powerups.length).toBe(0);
  });

  it('generates different layouts on successive calls (randomized)', () => {
    const a = generateLevel(0, false);
    const b = generateLevel(0, false);
    // with randomization, platform positions should differ
    // (extremely unlikely to be identical)
    const aPlatforms = a.tiles.filter((t) => t.type === 'platform').map((t) => `${t.x},${t.y}`);
    const bPlatforms = b.tiles.filter((t) => t.type === 'platform').map((t) => `${t.x},${t.y}`);
    // at least some difference in platforms or enemies
    const same = aPlatforms.join('|') === bPlatforms.join('|') && a.enemies.length === b.enemies.length;
    // this could theoretically fail with astronomically low probability
    expect(same).toBe(false);
  });

  it('arena has 25 tiles of ground', () => {
    [level0, level1, level2].forEach((l) => {
      const arenaStartTile = l.bossArenaX / TILE;
      const arenaGround = l.tiles.filter(
        (t) => t.type === 'ground' && t.y === 12 && t.x >= arenaStartTile && t.x < arenaStartTile + 25,
      );
      expect(arenaGround.length).toBe(25);
    });
  });

  it('all tile coordinates are non-negative', () => {
    [level0, level1, level2].forEach((l) => {
      l.tiles.forEach((t) => {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
