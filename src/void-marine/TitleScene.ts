import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants';
import { LEVELS } from './levels';
import { sfx } from './sfx';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a12);
    for (let i = 0; i < 60; i++)
      this.add.rectangle(
        Math.random() * GAME_W,
        Math.random() * GAME_H,
        1 + Math.random(),
        1 + Math.random(),
        0xffffff,
        0.2 + Math.random() * 0.6,
      );

    const t = this.add
      .text(GAME_W / 2, GAME_H / 2 - 80, 'VOID MARINE', {
        fontFamily: '"Press Start 2P"',
        fontSize: '36px',
        color: '#00ff88',
        shadow: { offsetX: 3, offsetY: 3, color: '#003322', blur: 0, fill: true },
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(GAME_W / 2, GAME_H / 2 - 30, '3 LEVELS  •  3 LIVES  •  5 BOSSES', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#2a6a4a',
      })
      .setOrigin(0.5);

    const lvlColors = ['#445544', '#553322', '#445566'];
    LEVELS.forEach((l, i) => {
      this.add
        .text(GAME_W / 2, GAME_H / 2 - 5 + i * 18, `${i + 1}. ${l.name}`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '8px',
          color: lvlColors[i],
        })
        .setOrigin(0.5);
    });

    const s = this.add
      .text(GAME_W / 2, GAME_H / 2 + 65, 'PRESS ANY KEY TO START', {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        color: '#ffaa00',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: s,
      alpha: { from: 1, to: 0.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(GAME_W / 2, GAME_H / 2 + 100, 'ARROWS/WASD — MOVE    SPACE — SHOOT', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#333333',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, GAME_H / 2 + 115, 'PRESS 1/2/3 — DEBUG START ON LEVEL', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#332233',
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const lvl = parseInt(e.key);
      if (lvl >= 1 && lvl <= 3) {
        sfx.powerup();
        this.scene.start('GameScene', { level: lvl - 1, debugMode: true, hasDoubleJump: true });
      } else {
        sfx.powerup();
        this.scene.start('GameScene', { level: 0 });
      }
    });
    this.input.on('pointerdown', () => {
      sfx.powerup();
      this.scene.start('GameScene', { level: 0 });
    });
  }
}
