import { describe, it, expect } from 'vitest';
import {
  GAME_W, GAME_H, TILE, GRAVITY, PLAYER_SPEED, JUMP_VEL,
  BULLET_SPEED, ENEMY_SPEED, FIRE_RATE, MAX_LIVES,
  COYOTE_TIME, JUMP_BUFFER,
} from '../constants';

describe('game constants', () => {
  it('has valid screen dimensions', () => {
    expect(GAME_W).toBeGreaterThan(0);
    expect(GAME_H).toBeGreaterThan(0);
    expect(GAME_W).toBe(800);
    expect(GAME_H).toBe(450);
  });

  it('has a power-of-two-friendly tile size', () => {
    expect(TILE).toBe(32);
    expect(GAME_W % TILE).toBe(0);
  });

  it('has positive gravity and speeds', () => {
    expect(GRAVITY).toBeGreaterThan(0);
    expect(PLAYER_SPEED).toBeGreaterThan(0);
    expect(BULLET_SPEED).toBeGreaterThan(0);
    expect(ENEMY_SPEED).toBeGreaterThan(0);
  });

  it('jump velocity is negative (upward)', () => {
    expect(JUMP_VEL).toBeLessThan(0);
  });

  it('fire rate and lives are sensible', () => {
    expect(FIRE_RATE).toBeGreaterThan(0);
    expect(MAX_LIVES).toBeGreaterThanOrEqual(1);
  });

  it('coyote time and jump buffer are positive ms values', () => {
    expect(COYOTE_TIME).toBeGreaterThan(0);
    expect(JUMP_BUFFER).toBeGreaterThan(0);
  });

  it('bullet is faster than player', () => {
    expect(BULLET_SPEED).toBeGreaterThan(PLAYER_SPEED);
  });
});
