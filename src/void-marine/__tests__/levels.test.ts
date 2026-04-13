import { describe, it, expect } from 'vitest';
import { LEVELS, BOSS_NAMES, BOSS_HP, type BossType } from '../levels';

describe('level definitions', () => {
  it('has exactly 3 levels', () => {
    expect(LEVELS).toHaveLength(3);
  });

  it('each level has a name and subtitle', () => {
    LEVELS.forEach((l) => {
      expect(l.name).toBeTruthy();
      expect(l.subtitle).toBeTruthy();
    });
  });

  it('each level has a positive width', () => {
    LEVELS.forEach((l) => {
      expect(l.levelWidth).toBeGreaterThan(50);
    });
  });

  it('each level has a non-empty boss pool', () => {
    LEVELS.forEach((l) => {
      expect(l.bossPool.length).toBeGreaterThan(0);
    });
  });

  it('all boss pool entries have matching names and HP', () => {
    const allBosses = LEVELS.flatMap((l) => l.bossPool);
    allBosses.forEach((b) => {
      expect(BOSS_NAMES[b]).toBeTruthy();
      expect(BOSS_HP[b]).toBeGreaterThan(0);
    });
  });

  it('only level 1 has a powerup position', () => {
    expect(LEVELS[0].powerupX).not.toBeNull();
    expect(LEVELS[1].powerupX).toBeNull();
    expect(LEVELS[2].powerupX).toBeNull();
  });

  it('only level 2 has lava hazard', () => {
    expect(LEVELS[0].hazard).toBeNull();
    expect(LEVELS[1].hazard).toBe('lava');
    expect(LEVELS[2].hazard).toBeNull();
  });

  it('only level 3 is slippery', () => {
    expect(LEVELS[0].slippery).toBe(false);
    expect(LEVELS[1].slippery).toBe(false);
    expect(LEVELS[2].slippery).toBe(true);
  });

  it('enemy speed/shoot multipliers are positive', () => {
    LEVELS.forEach((l) => {
      expect(l.enemySpeedMult).toBeGreaterThan(0);
      expect(l.enemyShootMult).toBeGreaterThan(0);
    });
  });
});

describe('boss definitions', () => {
  const allBossTypes: BossType[] = ['mech', 'brute', 'drone', 'wyrm', 'overlord'];

  it('has 5 boss types', () => {
    expect(Object.keys(BOSS_NAMES)).toHaveLength(5);
    expect(Object.keys(BOSS_HP)).toHaveLength(5);
  });

  it('every boss type appears in at least one level', () => {
    const used = new Set(LEVELS.flatMap((l) => l.bossPool));
    allBossTypes.forEach((b) => {
      expect(used.has(b)).toBe(true);
    });
  });

  it('boss HP values are between 10 and 50', () => {
    allBossTypes.forEach((b) => {
      expect(BOSS_HP[b]).toBeGreaterThanOrEqual(10);
      expect(BOSS_HP[b]).toBeLessThanOrEqual(50);
    });
  });
});
