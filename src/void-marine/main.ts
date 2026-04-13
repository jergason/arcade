import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants';
import { TitleScene } from './TitleScene';
import { GameScene } from './GameScene';
import { initTouchIfNeeded } from './touch';

initTouchIfNeeded();

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [TitleScene, GameScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
