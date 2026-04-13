import Phaser from 'phaser';
import { TILE } from './constants';
import { LEVELS } from './levels';

export function createTextures(scene: Phaser.Scene, levelIdx: number) {
  const L = LEVELS[levelIdx];
  const mg = () => scene.make.graphics({ x: 0, y: 0, add: false });

  // player right
  let p = mg();
  p.fillStyle(0x444444); p.fillRect(2, 20, 5, 4); p.fillRect(9, 20, 5, 4);
  p.fillStyle(0x2255aa); p.fillRect(3, 16, 4, 5); p.fillRect(9, 16, 4, 5);
  p.fillStyle(0x3366cc); p.fillRect(2, 8, 12, 9);
  p.fillStyle(0x5588ee); p.fillRect(3, 9, 10, 4);
  p.fillStyle(0x555555); p.fillRect(3, 1, 10, 6);
  p.fillStyle(0x00ff88); p.fillRect(5, 2, 6, 3);
  p.fillStyle(0x888888); p.fillRect(13, 10, 6, 3);
  p.fillStyle(0xaaaa00); p.fillRect(17, 10, 3, 2);
  p.generateTexture('player', 20, 24); p.destroy();

  // player left
  p = mg();
  p.fillStyle(0x444444); p.fillRect(2, 20, 5, 4); p.fillRect(9, 20, 5, 4);
  p.fillStyle(0x2255aa); p.fillRect(3, 16, 4, 5); p.fillRect(9, 16, 4, 5);
  p.fillStyle(0x3366cc); p.fillRect(2, 8, 12, 9);
  p.fillStyle(0x5588ee); p.fillRect(3, 9, 10, 4);
  p.fillStyle(0x555555); p.fillRect(3, 1, 10, 6);
  p.fillStyle(0x00ff88); p.fillRect(5, 2, 6, 3);
  p.fillStyle(0x888888); p.fillRect(-3, 10, 6, 3);
  p.fillStyle(0xaaaa00); p.fillRect(-4, 10, 3, 2);
  p.generateTexture('player_left', 20, 24); p.destroy();

  // bullet
  p = mg();
  p.fillStyle(0xffff00); p.fillRect(0, 0, 6, 3);
  p.fillStyle(0xffffff); p.fillRect(1, 1, 4, 1);
  p.generateTexture('bullet', 6, 3); p.destroy();

  // enemy bullet
  p = mg();
  p.fillStyle(0xff4444); p.fillRect(0, 0, 5, 5);
  p.fillStyle(0xff8888); p.fillRect(1, 1, 3, 3);
  p.generateTexture('enemy_bullet', 5, 5); p.destroy();

  // ground (themed)
  p = mg();
  p.fillStyle(L.groundColor); p.fillRect(0, 0, TILE, TILE);
  p.fillStyle(L.groundTop); p.fillRect(0, 0, TILE, 3);
  p.fillStyle(L.groundDetail);
  for (let i = 0; i < 4; i++)
    p.fillRect(
      Math.floor(Math.random() * (TILE - 4)),
      4 + Math.floor(Math.random() * (TILE - 8)),
      3 + Math.floor(Math.random() * 4),
      2,
    );
  p.generateTexture('ground', TILE, TILE); p.destroy();

  // platform (themed)
  p = mg();
  p.fillStyle(L.platColor); p.fillRect(0, 0, TILE, TILE);
  p.fillStyle(L.platTop); p.fillRect(0, 0, TILE, 4);
  p.fillStyle(L.platDetail); p.fillRect(2, 6, TILE - 4, 2);
  p.generateTexture('platform', TILE, TILE); p.destroy();

  // arena wall
  p = mg();
  p.fillStyle(L.arenaWall); p.fillRect(0, 0, TILE, TILE);
  p.fillStyle(L.arenaWallInner); p.fillRect(2, 2, TILE - 4, TILE - 4);
  p.generateTexture('arena_wall', TILE, TILE); p.destroy();

  // grunt
  p = mg();
  p.fillStyle(0xaa2222); p.fillRect(2, 6, 12, 12);
  p.fillStyle(0xcc3333); p.fillRect(3, 7, 10, 4);
  p.fillStyle(0x882222); p.fillRect(3, 0, 10, 7);
  p.fillStyle(0xff0000); p.fillRect(4, 2, 3, 3); p.fillRect(9, 2, 3, 3);
  p.fillStyle(0xffff00); p.fillRect(5, 3, 1, 1); p.fillRect(10, 3, 1, 1);
  p.fillStyle(0x661111); p.fillRect(3, 17, 4, 5); p.fillRect(9, 17, 4, 5);
  p.generateTexture('enemy_grunt', 16, 22); p.destroy();

  // shooter
  p = mg();
  p.fillStyle(0x8822aa); p.fillRect(2, 6, 12, 14);
  p.fillStyle(0xaa33cc); p.fillRect(3, 7, 10, 5);
  p.fillStyle(0x6622aa); p.fillRect(3, 0, 10, 7);
  p.fillStyle(0xff00ff); p.fillRect(4, 2, 3, 3); p.fillRect(9, 2, 3, 3);
  p.fillStyle(0xffffff); p.fillRect(5, 3, 1, 1); p.fillRect(10, 3, 1, 1);
  p.fillStyle(0x888888); p.fillRect(-4, 12, 7, 3);
  p.fillStyle(0xff4444); p.fillRect(-5, 12, 2, 2);
  p.fillStyle(0x551188); p.fillRect(3, 19, 4, 5); p.fillRect(9, 19, 4, 5);
  p.generateTexture('enemy_shooter', 16, 24); p.destroy();

  // particles, star
  p = mg();
  p.fillStyle(0xffaa00); p.fillRect(0, 0, 4, 4);
  p.generateTexture('particle', 4, 4); p.destroy();

  p = mg();
  p.fillStyle(L.starColor); p.fillRect(0, 0, 2, 2);
  p.generateTexture('star', 2, 2); p.destroy();

  // powerup
  p = mg();
  p.fillStyle(0x0044aa); p.fillRect(2, 0, 12, 16);
  p.fillStyle(0x0066dd); p.fillRect(3, 1, 10, 14);
  p.fillStyle(0x00aaff); p.fillRect(4, 3, 8, 5);
  p.fillStyle(0x44ccff); p.fillRect(5, 4, 6, 3);
  p.fillStyle(0xffffff); p.fillRect(1, 5, 3, 2); p.fillRect(12, 5, 3, 2);
  p.fillStyle(0xffff00); p.fillRect(7, 10, 2, 4); p.fillRect(6, 11, 4, 2);
  p.generateTexture('powerup_djump', 16, 16); p.destroy();

  // boss_mech
  p = mg();
  p.fillStyle(0x664422); p.fillRect(8, 32, 32, 16);
  p.fillStyle(0x886633); p.fillRect(12, 28, 24, 8);
  p.fillStyle(0x555555); p.fillRect(14, 8, 20, 22);
  p.fillStyle(0x777777); p.fillRect(16, 10, 16, 8);
  p.fillStyle(0xff0000); p.fillRect(20, 12, 8, 4);
  p.fillStyle(0xffaa00); p.fillRect(22, 13, 4, 2);
  p.fillStyle(0x888888); p.fillRect(0, 14, 16, 4); p.fillRect(32, 14, 16, 4);
  p.fillStyle(0xff4400); p.fillRect(0, 15, 3, 2); p.fillRect(45, 15, 3, 2);
  p.generateTexture('boss_mech', 48, 48); p.destroy();

  // boss_brute
  p = mg();
  p.fillStyle(0x553333); p.fillRect(8, 30, 10, 18); p.fillRect(22, 30, 10, 18);
  p.fillStyle(0x882222); p.fillRect(4, 10, 32, 22);
  p.fillStyle(0xaa3333); p.fillRect(8, 12, 24, 8);
  p.fillStyle(0x661111); p.fillRect(8, 0, 24, 14);
  p.fillStyle(0xff0000); p.fillRect(12, 4, 6, 4); p.fillRect(22, 4, 6, 4);
  p.fillStyle(0xffff00); p.fillRect(14, 5, 2, 2); p.fillRect(24, 5, 2, 2);
  p.fillStyle(0x993333); p.fillRect(0, 16, 6, 10); p.fillRect(34, 16, 6, 10);
  p.generateTexture('boss_brute', 40, 48); p.destroy();

  // boss_drone
  p = mg();
  p.fillStyle(0x224466); p.fillRect(8, 8, 40, 16);
  p.fillStyle(0x335588); p.fillRect(12, 6, 32, 20);
  p.fillStyle(0x44aaff); p.fillRect(22, 10, 12, 6);
  p.fillStyle(0x88ccff); p.fillRect(24, 11, 8, 4);
  p.fillStyle(0x1a3355); p.fillRect(0, 12, 12, 8); p.fillRect(44, 12, 12, 8);
  p.fillStyle(0xff6600); p.fillRect(2, 20, 8, 4); p.fillRect(46, 20, 8, 4);
  p.fillStyle(0x888888); p.fillRect(16, 24, 4, 8); p.fillRect(36, 24, 4, 8);
  p.fillStyle(0xff4444); p.fillRect(17, 30, 2, 3); p.fillRect(37, 30, 2, 3);
  p.generateTexture('boss_drone', 56, 32); p.destroy();

  // boss_wyrm
  p = mg();
  p.fillStyle(0xaa3300); p.fillRect(4, 4, 56, 24);
  p.fillStyle(0xff5500); p.fillRect(8, 6, 48, 20);
  p.fillStyle(0xffaa00); p.fillRect(12, 10, 12, 12);
  p.fillStyle(0xff0000); p.fillRect(14, 12, 4, 4); p.fillRect(20, 12, 4, 4);
  p.fillStyle(0xffff00); p.fillRect(15, 13, 2, 2); p.fillRect(21, 13, 2, 2);
  p.fillStyle(0xcc4400); p.fillRect(28, 8, 8, 16); p.fillRect(40, 8, 8, 16); p.fillRect(52, 8, 8, 16);
  p.fillStyle(0xff2200); p.fillRect(10, 18, 8, 6);
  p.fillStyle(0xffff00); p.fillRect(11, 18, 2, 4); p.fillRect(16, 18, 2, 4);
  p.generateTexture('boss_wyrm', 64, 32); p.destroy();

  // boss_overlord
  p = mg();
  p.fillStyle(0x2244aa); p.fillRect(8, 16, 24, 28);
  p.fillStyle(0x3366cc); p.fillRect(10, 18, 20, 10);
  p.fillStyle(0x88bbff); p.fillRect(12, 20, 16, 6);
  p.fillStyle(0x4466bb); p.fillRect(10, 2, 20, 16);
  p.fillStyle(0x1133aa); p.fillRect(12, 0, 16, 4);
  p.fillStyle(0x44ffff); p.fillRect(14, 6, 4, 4); p.fillRect(22, 6, 4, 4);
  p.fillStyle(0xffffff); p.fillRect(15, 7, 2, 2); p.fillRect(23, 7, 2, 2);
  p.fillStyle(0x2244aa); p.fillRect(0, 20, 10, 4); p.fillRect(30, 20, 10, 4);
  p.fillStyle(0x88eeff); p.fillRect(0, 18, 4, 8);
  p.fillStyle(0xffffff); p.fillRect(1, 19, 2, 2);
  p.generateTexture('boss_overlord', 40, 48); p.destroy();

  // boss bullet
  p = mg();
  p.fillStyle(0xff6600); p.fillRect(0, 0, 8, 8);
  p.fillStyle(0xffaa00); p.fillRect(1, 1, 6, 6);
  p.fillStyle(0xffff00); p.fillRect(2, 2, 4, 4);
  p.generateTexture('boss_bullet', 8, 8); p.destroy();

  // ice bullet
  p = mg();
  p.fillStyle(0x44aaff); p.fillRect(0, 0, 7, 7);
  p.fillStyle(0xaaddff); p.fillRect(1, 1, 5, 5);
  p.fillStyle(0xffffff); p.fillRect(2, 2, 3, 3);
  p.generateTexture('ice_bullet', 7, 7); p.destroy();

  // fireball
  p = mg();
  p.fillStyle(0xff4400); p.fillRect(0, 0, 10, 10);
  p.fillStyle(0xff8800); p.fillRect(1, 1, 8, 8);
  p.fillStyle(0xffcc00); p.fillRect(2, 2, 6, 6);
  p.fillStyle(0xffff88); p.fillRect(3, 3, 4, 4);
  p.generateTexture('fireball', 10, 10); p.destroy();

  // lava tile
  p = mg();
  p.fillStyle(0xff4400); p.fillRect(0, 0, TILE, TILE);
  p.fillStyle(0xff6600); p.fillRect(0, 0, TILE, 4);
  p.fillStyle(0xffaa00);
  for (let i = 0; i < 3; i++)
    p.fillRect(Math.random() * 24, 4 + Math.random() * 20, 6, 3);
  p.generateTexture('lava', TILE, TILE); p.destroy();

  // ice wall
  p = mg();
  p.fillStyle(0x5588bb); p.fillRect(0, 0, TILE, TILE);
  p.fillStyle(0x88bbdd); p.fillRect(2, 2, TILE - 4, TILE - 4);
  p.fillStyle(0xaaddff); p.fillRect(4, 4, 8, 8);
  p.generateTexture('ice_wall', TILE, TILE); p.destroy();
}
