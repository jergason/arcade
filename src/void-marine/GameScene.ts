import Phaser from 'phaser';
import {
  GAME_W, GAME_H, TILE, GRAVITY, PLAYER_SPEED, JUMP_VEL,
  BULLET_SPEED, ENEMY_SPEED, FIRE_RATE, MAX_LIVES,
  COYOTE_TIME, JUMP_BUFFER,
} from './constants';
import { LEVELS, BOSS_NAMES, BOSS_HP, type BossType, type LevelDef } from './levels';
import { sfx } from './sfx';
import { touchState } from './touch';
import { createTextures } from './textures';
import { generateLevel, type LevelData } from './levelgen';

interface InitData {
  level?: number;
  score?: number;
  kills?: number;
  lives?: number;
  hasDoubleJump?: boolean;
  debugMode?: boolean;
}

export class GameScene extends Phaser.Scene {
  // carry-over state
  private currentLevel!: number;
  private carryScore!: number;
  private carryKills!: number;
  private carryLives!: number;
  private carryDoubleJump!: boolean;
  private debugMode!: boolean;

  // level
  private levelDef!: LevelDef;
  private levelData!: LevelData;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private slippery!: boolean;

  // player
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
    hp: number; maxHp: number; facing: number; invincible: boolean;
    coyoteTimer: number; jumpBufferTimer: number;
    hasDoubleJump: boolean; airJumpsLeft: number; frozen: boolean;
  };
  private lives!: number;
  private lastSafeX!: number;
  private lastSafeY!: number;
  private respawning!: boolean;

  // groups
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private iceWalls!: Phaser.Physics.Arcade.StaticGroup;

  // input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private debugBossKey!: Phaser.Input.Keyboard.Key;
  private lastFired!: number;

  // HUD
  private score!: number;
  private kills!: number;
  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private djumpText!: Phaser.GameObjects.Text;

  // boss
  private boss: any;
  private bossActive!: boolean;
  private bossTriggered!: boolean;
  private bossHpBar: Phaser.GameObjects.Rectangle | null = null;
  private bossHpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private bossNameText: Phaser.GameObjects.Text | null = null;

  // lava
  private lavaY: number | null = null;
  private lavaBaseY!: number;
  private lavaFill!: Phaser.GameObjects.Rectangle;
  private lavaSprites!: Phaser.GameObjects.Image[];
  private lavaRising!: boolean;
  private _lastLavaPlatTime = 0;

  // end state
  private gameOver!: boolean;
  private victory!: boolean;
  private _endTime = 0;
  private _tapRestarting = false;

  constructor() {
    super('GameScene');
  }

  init(data: InitData) {
    this.currentLevel = data.level || 0;
    this.carryScore = data.score || 0;
    this.carryKills = data.kills || 0;
    this.carryLives = data.lives !== undefined ? data.lives : MAX_LIVES;
    this.carryDoubleJump = data.hasDoubleJump || false;
    this.debugMode = data.debugMode || false;
  }

  create() {
    const L = LEVELS[this.currentLevel];
    // clear old textures
    Object.keys(this.textures.list).forEach((k) => {
      if (k !== '__DEFAULT' && k !== '__MISSING')
        try { this.textures.remove(k); } catch (_) {}
    });
    createTextures(this, this.currentLevel);
    this.cameras.main.setBackgroundColor(L.bg);

    // stars bg
    for (let i = 0; i < 120; i++)
      this.add
        .image(Math.random() * GAME_W * 7, Math.random() * GAME_H, 'star')
        .setAlpha(L.starAlphaBase + Math.random() * 0.5)
        .setScrollFactor(0.1 + Math.random() * 0.3);

    // level
    this.levelDef = L;
    this.levelData = generateLevel(this.currentLevel, this.carryDoubleJump);
    this.platforms = this.physics.add.staticGroup();
    this.levelData.tiles.forEach((t) => {
      const tex = t.type === 'arena_wall' ? 'arena_wall' : t.type === 'ground' ? 'ground' : 'platform';
      this.platforms.create(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, tex);
    });

    // player
    const pl = this.physics.add.sprite(100, 300, 'player') as any;
    pl.setCollideWorldBounds(false);
    pl.body.setSize(14, 22);
    pl.body.setGravityY(GRAVITY);
    pl.hp = 5; pl.maxHp = 5; pl.facing = 1; pl.invincible = false;
    pl.coyoteTimer = 0; pl.jumpBufferTimer = 0;
    pl.hasDoubleJump = this.carryDoubleJump;
    pl.airJumpsLeft = this.carryDoubleJump ? 1 : 0;
    pl.frozen = false;
    this.player = pl;
    this.slippery = L.slippery;
    this.physics.add.collider(pl, this.platforms);

    // lives
    this.lives = this.carryLives;
    this.lastSafeX = 100;
    this.lastSafeY = 300;
    this.respawning = false;

    // bullets
    this.bullets = this.physics.add.group({ runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ runChildUpdate: true });

    // enemies
    this.enemies = this.physics.add.group();
    const eSpdMult = L.enemySpeedMult;
    this.levelData.enemies.forEach((e) => {
      const en = this.enemies.create(e.x, e.y, e.type === 'shooter' ? 'enemy_shooter' : 'enemy_grunt') as any;
      en.enemyType = e.type;
      en.body.setGravityY(GRAVITY);
      en.hp = e.type === 'shooter' ? 2 : 1;
      en.lastShot = 0;
      en.body.setSize(14, 20);
      if (L.enemyTint) en.setTint(L.enemyTint);
      if (e.type === 'grunt') {
        en.setVelocityX(-ENEMY_SPEED * eSpdMult);
        en.patrolDir = -1;
        en.patrolTimer = 0;
      }
      en.speedMult = eSpdMult;
      en.shootMult = L.enemyShootMult;
    });
    this.physics.add.collider(this.enemies, this.platforms);

    // collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy as any, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.enemyBulletHitPlayer as any, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerTouchEnemy as any, undefined, this);

    // powerups
    this.powerups = this.physics.add.group();
    this.levelData.powerups.forEach((pu) => {
      const pw = this.powerups.create(pu.x, pu.y, 'powerup_djump') as any;
      pw.body.setAllowGravity(false);
      pw.powerupType = pu.type;
      this.tweens.add({ targets: pw, y: pu.y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup as any, undefined, this);

    // lava hazard (level 2)
    this.lavaY = null;
    if (L.hazard === 'lava') {
      const groundPx = 12 * TILE;
      this.lavaBaseY = groundPx + TILE * 4;
      this.lavaFill = this.add.rectangle(0, 0, GAME_W * 8, GAME_H * 3, 0xcc3300).setOrigin(0, 0).setDepth(49).setAlpha(0.8);
      this.lavaFill.y = this.lavaBaseY;
      this.lavaSprites = [];
      const totalWidth = L.levelWidth + 30;
      for (let lx = 0; lx < totalWidth; lx++) {
        const ls = this.add.image(lx * TILE + TILE / 2, this.lavaBaseY, 'lava').setDepth(50).setAlpha(0.9);
        this.lavaSprites.push(ls);
      }
      this.lavaRising = false;
      this.lavaY = this.lavaBaseY;
    }

    // ice walls
    this.iceWalls = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.iceWalls);
    this.physics.add.collider(this.enemies, this.iceWalls);

    // input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any;
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.debugBossKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.lastFired = 0;

    // camera
    this.cameras.main.startFollow(pl, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(100, 50);

    // HUD
    this.score = this.carryScore;
    this.kills = this.carryKills;
    const hs = { fontFamily: '"Press Start 2P"', fontSize: '12px' };
    this.scoreText = this.add.text(16, 16, 'SCORE: ' + this.score, { ...hs, color: '#00ff88' }).setScrollFactor(0).setDepth(100);
    this.hpText = this.add.text(16, 36, '', { ...hs, color: '#ff4444' }).setScrollFactor(0).setDepth(100);
    this.killText = this.add.text(GAME_W - 16, 16, 'KILLS: ' + this.kills, { ...hs, color: '#ffaa00' }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);
    this.livesText = this.add.text(GAME_W - 16, 36, '', { ...hs, fontSize: '10px', color: '#44ff44' }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);
    this.djumpText = this.add.text(GAME_W / 2, 16, '', { ...hs, fontSize: '10px', color: '#44ccff' }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);
    this.djumpText.setAlpha(pl.hasDoubleJump ? 1 : 0);
    if (pl.hasDoubleJump) this.djumpText.setText('✦ DOUBLE JUMP ✦');
    this.add.text(GAME_W / 2, GAME_H - 16, `LEVEL ${this.currentLevel + 1}: ${L.name}`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff44',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.updateHpDisplay();
    this.updateLivesDisplay();

    // boss
    this.boss = null;
    this.bossActive = false;
    this.bossTriggered = false;
    this.bossHpBar = null;
    this.bossHpBarBg = null;
    this.bossNameText = null;

    // state
    this.gameOver = false;
    this.victory = false;
    this._endTime = 0;
    this._tapRestarting = false;
    this._lastLavaPlatTime = 0;

    // level intro
    const introText = this.add.text(GAME_W / 2, GAME_H / 2 - 20, `LEVEL ${this.currentLevel + 1}`, {
      fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    const subText = this.add.text(GAME_W / 2, GAME_H / 2 + 15, L.name, {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffaa00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    const sub2 = this.add.text(GAME_W / 2, GAME_H / 2 + 35, L.subtitle, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [introText, subText, sub2], alpha: 0, duration: 500,
        onComplete: () => { introText.destroy(); subText.destroy(); sub2.destroy(); },
      });
    });
  }

  // ---- HUD helpers ----

  private updateHpDisplay() {
    this.hpText.setText('♥'.repeat(this.player.hp) + '♡'.repeat(this.player.maxHp - this.player.hp));
  }

  private updateLivesDisplay() {
    this.livesText.setText('LIVES: ' + this.lives);
  }

  // ---- powerups ----

  private collectPowerup(_player: any, powerup: any) {
    powerup.destroy();
    if (powerup.powerupType === 'double_jump') {
      this.player.hasDoubleJump = true;
      sfx.powerup();
      this.cameras.main.flash(200, 0, 100, 255);
      this.djumpText.setText('✦ DOUBLE JUMP ✦');
      this.djumpText.setAlpha(1);
      const a = this.add.text(this.player.x, this.player.y - 40, 'DOUBLE JUMP!', {
        fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#44ccff',
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: a, y: a.y - 50, alpha: 0, duration: 1500, onComplete: () => a.destroy() });
    }
  }

  // ---- combat ----

  private fire() {
    if (this.gameOver || this.victory || this.respawning || this.player.frozen) return;
    if (this.time.now - this.lastFired < FIRE_RATE) return;
    this.lastFired = this.time.now;
    sfx.shoot();
    const dir = this.player.facing;
    const b = this.bullets.create(this.player.x + (dir > 0 ? 12 : -12), this.player.y - 1, 'bullet');
    b.body.setAllowGravity(false);
    b.setVelocityX(BULLET_SPEED * dir);
    if (dir < 0) b.setFlipX(true);
  }

  private enemyShoot(enemy: any) {
    const rate = 1500 * enemy.shootMult;
    if (this.time.now - enemy.lastShot < rate) return;
    enemy.lastShot = this.time.now;
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    if (Math.sqrt(dx * dx + dy * dy) > 400) return;
    const ang = Math.atan2(dy, dx);
    const b = this.enemyBullets.create(enemy.x, enemy.y - 2, 'enemy_bullet');
    b.body.setAllowGravity(false);
    b.setVelocity(Math.cos(ang) * 200, Math.sin(ang) * 200);
    sfx.rawTone(300, 0.1, 'sawtooth', 150, 0.06);
    this.time.delayedCall(3000, () => { if (b.active) b.destroy(); });
  }

  private spawnExplosion(x: number, y: number, color = 0xffaa00, count = 8) {
    for (let i = 0; i < count; i++) {
      const pr = this.add.image(x, y, 'particle').setTint(color);
      const ang = (Math.PI * 2 * i) / count;
      const spd = 60 + Math.random() * 80;
      this.tweens.add({
        targets: pr,
        x: x + Math.cos(ang) * spd,
        y: y + Math.sin(ang) * spd,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 300 + Math.random() * 200,
        onComplete: () => pr.destroy(),
      });
    }
  }

  private bulletHitEnemy(bullet: any, enemy: any) {
    if (enemy === this.boss) return;
    bullet.destroy();
    enemy.hp--;
    sfx.hit();
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => {
      if (enemy.active) {
        enemy.clearTint();
        if (this.levelDef.enemyTint) enemy.setTint(this.levelDef.enemyTint);
      }
    });
    if (enemy.hp <= 0) {
      sfx.enemyDie();
      this.spawnExplosion(enemy.x, enemy.y, enemy.enemyType === 'shooter' ? 0xff00ff : 0xff4400);
      this.score += enemy.enemyType === 'shooter' ? 200 : 100;
      this.kills++;
      this.scoreText.setText('SCORE: ' + this.score);
      this.killText.setText('KILLS: ' + this.kills);
      enemy.destroy();
    }
  }

  private bulletHitBoss(a: any, b: any) {
    let bullet: any, boss: any;
    if (a.texture && a.texture.key === 'bullet') { bullet = a; boss = b; } else { bullet = b; boss = a; }
    bullet.destroy();
    if (!this.bossActive || !boss.active) return;
    boss.hp--;
    sfx.bossHit();
    boss.setTintFill(0xffffff);
    this.time.delayedCall(80, () => { if (boss.active) boss.clearTint(); });
    this.updateBossHpBar();
    if (boss.hp <= 0) this.defeatBoss();
  }

  private damagePlayer() {
    if (this.player.invincible || this.gameOver || this.victory || this.respawning) return;
    this.player.hp--;
    sfx.playerHit();
    this.updateHpDisplay();
    this.cameras.main.shake(150, 0.01);
    if (this.player.hp <= 0) { this.playerDeath(); return; }
    this.player.invincible = true;
    this.tweens.add({
      targets: this.player, alpha: { from: 0.3, to: 1 }, duration: 100, repeat: 10,
      onComplete: () => { this.player.invincible = false; this.player.setAlpha(1); },
    });
  }

  private freezePlayer() {
    if (this.player.frozen || this.player.invincible) return;
    this.player.frozen = true;
    this.player.setTint(0x88ccff);
    sfx.freeze();
    this.time.delayedCall(800, () => { this.player.frozen = false; this.player.clearTint(); });
  }

  private playerDeath() {
    sfx.death();
    this.spawnExplosion(this.player.x, this.player.y, 0x00ff88);
    this.player.setVisible(false);
    this.player.body.enable = false;
    this.cameras.main.shake(300, 0.015);
    this.lives--;
    this.updateLivesDisplay();
    if (this.lives < 0) { this.doGameOver(); return; }
    this.respawning = true;
    this.time.delayedCall(1500, () => {
      this.player.setPosition(this.lastSafeX, this.lastSafeY - 20);
      this.player.setVisible(true);
      this.player.body.enable = true;
      this.player.setVelocity(0, 0);
      this.player.hp = this.player.maxHp;
      this.updateHpDisplay();
      this.player.invincible = true;
      this.respawning = false;
      this.tweens.add({
        targets: this.player, alpha: { from: 0.3, to: 1 }, duration: 120, repeat: 16,
        onComplete: () => { this.player.invincible = false; this.player.setAlpha(1); },
      });
      const lt = this.add.text(
        GAME_W / 2, GAME_H / 2 - 60,
        this.lives === 0 ? 'FINAL LIFE' : 'LIVES: ' + this.lives,
        { fontFamily: '"Press Start 2P"', fontSize: '16px', color: this.lives === 0 ? '#ff4444' : '#ffaa00' },
      ).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.tweens.add({ targets: lt, alpha: 0, y: lt.y - 30, duration: 2000, onComplete: () => lt.destroy() });
    });
  }

  private enemyBulletHitPlayer(_pl: any, bullet: any) {
    if (bullet.texture && bullet.texture.key === 'ice_bullet') {
      bullet.destroy();
      this.freezePlayer();
      this.damagePlayer();
      return;
    }
    bullet.destroy();
    this.damagePlayer();
  }

  private playerTouchEnemy(_pl: any, enemy: any) {
    if (enemy === this.boss) return;
    this.damagePlayer();
  }

  // ---- boss system ----

  private spawnBoss() {
    if (this.bossTriggered) return;
    this.bossTriggered = true;
    const groundPx = 12 * TILE;
    const arenaX = this.levelData.bossArenaX;

    if (this.levelDef.hazard === 'lava') this.lavaRising = true;

    const warn = this.add.text(GAME_W / 2, GAME_H / 2 - 40, '⚠ WARNING ⚠', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ff2222',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: warn, alpha: { from: 1, to: 0.2 }, duration: 200, yoyo: true, repeat: 5, onComplete: () => warn.destroy() });
    this.cameras.main.flash(500, 255, 0, 0);

    this.time.delayedCall(1500, () => {
      const pool = this.levelDef.bossPool;
      const bossType = pool[Math.floor(Math.random() * pool.length)];
      let boss: any;

      if (bossType === 'mech') {
        boss = this.physics.add.sprite(arenaX + 12 * TILE, groundPx - 80, 'boss_mech');
        boss.body.setSize(44, 44); boss.body.setGravityY(GRAVITY); boss.body.moves = true;
        boss.bossType = 'mech'; boss.lastShot = 0; boss.burstCount = 0;
      } else if (bossType === 'brute') {
        boss = this.physics.add.sprite(arenaX + 12 * TILE, groundPx - 80, 'boss_brute');
        boss.body.setSize(36, 44); boss.body.setGravityY(GRAVITY);
        boss.bossType = 'brute'; boss.lastAction = 0; boss.charging = false; boss.wasInAir = false;
      } else if (bossType === 'drone') {
        boss = this.physics.add.sprite(arenaX + 12 * TILE, groundPx - 90, 'boss_drone');
        boss.body.setSize(52, 28); boss.body.setAllowGravity(false);
        boss.bossType = 'drone'; boss.lastShot = 0; boss.movePhase = 0; boss.phaseTimer = 0;
        boss.homeY = groundPx - 90; boss.homeX = arenaX + 12 * TILE;
      } else if (bossType === 'wyrm') {
        boss = this.physics.add.sprite(arenaX + 12 * TILE, groundPx - 100, 'boss_wyrm');
        boss.body.setSize(60, 28); boss.body.setAllowGravity(false);
        boss.bossType = 'wyrm'; boss.lastShot = 0; boss.phaseTimer = 0; boss.diveTimer = 0; boss.diving = false;
        boss.homeY = groundPx - 140; boss.homeX = arenaX + 12 * TILE;
      } else if (bossType === 'overlord') {
        boss = this.physics.add.sprite(arenaX + 12 * TILE, groundPx - 60, 'boss_overlord');
        boss.body.setSize(36, 44); boss.body.setGravityY(GRAVITY);
        boss.bossType = 'overlord'; boss.lastShot = 0; boss.lastTeleport = 0; boss.lastWall = 0; boss.phaseTimer = 0;
      }

      boss.hp = BOSS_HP[bossType];
      boss.maxHp = boss.hp;
      if (this.debugMode) { boss.hp = 2; boss.maxHp = 2; }
      this.boss = boss;
      this.bossActive = true;
      this.physics.add.collider(boss, this.platforms);
      this.physics.add.collider(boss, this.iceWalls);
      this.physics.add.overlap(this.bullets, boss, this.bulletHitBoss as any, undefined, this);
      this.physics.add.overlap(this.player, boss, () => this.damagePlayer(), undefined, this);

      this.bossHpBarBg = this.add.rectangle(GAME_W / 2, 60, 300, 16, 0x440000).setScrollFactor(0).setDepth(100);
      this.bossHpBar = this.add.rectangle(GAME_W / 2 - 148, 60, 296, 12, 0xff0000).setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
      this.bossNameText = this.add.text(GAME_W / 2, 44, BOSS_NAMES[bossType], {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ff6666',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    });
  }

  private updateBossHpBar() {
    if (!this.boss || !this.bossHpBar) return;
    const pct = Math.max(0, this.boss.hp / this.boss.maxHp);
    this.bossHpBar.width = 296 * pct;
    this.bossHpBar.setFillStyle(pct < 0.3 ? 0xff4400 : pct < 0.6 ? 0xffaa00 : 0xff0000);
  }

  private updateBoss() {
    if (!this.bossActive || !this.boss || !this.boss.active) return;
    const b = this.boss;
    const p = this.player;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const now = this.time.now;

    // boss fell off map
    if (b.y > 13 * TILE + 100) {
      const arenaX = this.levelData.bossArenaX;
      b.setPosition(arenaX + 12 * TILE, 8 * TILE);
      b.setVelocity(0, 0);
      b.hp -= 3;
      sfx.bossSlam();
      this.cameras.main.shake(150, 0.01);
      this.spawnExplosion(b.x, b.y, 0xff4400, 6);
      this.updateBossHpBar();
      if (b.hp <= 0) { this.defeatBoss(); return; }
    }

    if (b.bossType === 'mech') {
      if (!b.homeX) b.homeX = b.x;
      b.setVelocityX(0);
      b.x = b.homeX;
      if (now - b.lastShot > 800) {
        b.lastShot = now; b.burstCount++; sfx.bossShoot();
        if (b.burstCount % 5 === 0) {
          for (let a = -2; a <= 2; a++) {
            const ang = Math.atan2(dy, dx) + a * 0.25;
            const bl = this.enemyBullets.create(b.x, b.y, 'boss_bullet');
            bl.body.setAllowGravity(false);
            bl.setVelocity(Math.cos(ang) * 180, Math.sin(ang) * 180);
            this.time.delayedCall(4000, () => { if (bl.active) bl.destroy(); });
          }
        } else {
          const ang = Math.atan2(dy, dx);
          const bl = this.enemyBullets.create(b.x, b.y, 'boss_bullet');
          bl.body.setAllowGravity(false);
          bl.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
          this.time.delayedCall(4000, () => { if (bl.active) bl.destroy(); });
        }
      }
      b.setFlipX(dx < 0);

    } else if (b.bossType === 'brute') {
      b.setFlipX(dx < 0);
      if (b.wasInAir && b.body.blocked.down) {
        sfx.bossSlam(); this.cameras.main.shake(200, 0.02);
        for (let dir = -1; dir <= 1; dir += 2) {
          const bl = this.enemyBullets.create(b.x, b.y, 'boss_bullet');
          bl.body.setAllowGravity(false); bl.setVelocity(dir * 250, 0);
          this.time.delayedCall(2000, () => { if (bl.active) bl.destroy(); });
        }
      }
      b.wasInAir = !b.body.blocked.down;
      if (!b.charging && b.body.blocked.down && now - b.lastAction > 1800) {
        b.lastAction = now;
        if (Math.random() < 0.55) {
          b.charging = true;
          b.setVelocityX((dx > 0 ? 1 : -1) * 300);
          sfx.bossShoot();
          this.time.delayedCall(700, () => { if (b.active) { b.setVelocityX(0); b.charging = false; } });
        } else {
          b.setVelocityY(-520);
          b.setVelocityX(dx > 0 ? 140 : -140);
        }
      }

    } else if (b.bossType === 'drone') {
      b.phaseTimer += this.game.loop.delta;
      b.setPosition(b.homeX + Math.sin(b.phaseTimer * 0.001) * 8 * TILE, b.homeY + Math.sin(b.phaseTimer * 0.002) * 60);
      if (now - b.lastShot > 600) {
        b.lastShot = now; b.movePhase++; sfx.bossShoot();
        if (b.movePhase % 8 === 0) {
          for (let i = -2; i <= 2; i++) {
            const bl = this.enemyBullets.create(b.x + i * 20, b.y + 16, 'boss_bullet');
            bl.body.setAllowGravity(false); bl.setVelocity(i * 30, 200);
            this.time.delayedCall(3000, () => { if (bl.active) bl.destroy(); });
          }
        } else {
          const ang = Math.atan2(dy, dx);
          const bl = this.enemyBullets.create(b.x, b.y + 14, 'boss_bullet');
          bl.body.setAllowGravity(false); bl.setVelocity(Math.cos(ang) * 200, Math.sin(ang) * 200);
          this.time.delayedCall(4000, () => { if (bl.active) bl.destroy(); });
        }
      }

    } else if (b.bossType === 'wyrm') {
      b.phaseTimer += this.game.loop.delta;
      const t = b.phaseTimer * 0.0008;
      b.setPosition(b.homeX + Math.sin(t) * 10 * TILE, b.homeY + Math.sin(t * 2) * 60);
      b.setFlipX(Math.cos(t) < 0);

      if (!b.diving && now - b.diveTimer > 4000 && b.hp < b.maxHp * 0.6) {
        b.diving = true; b.diveTimer = now;
        this.tweens.add({
          targets: b, y: 12 * TILE - 40, duration: 600, ease: 'Quad.easeIn',
          onComplete: () => {
            sfx.bossSlam(); this.cameras.main.shake(200, 0.02);
            for (let dir = -1; dir <= 1; dir += 2) {
              for (let i = 1; i <= 3; i++) {
                this.time.delayedCall(i * 100, () => {
                  const fb = this.enemyBullets.create(b.x + dir * i * 30, 12 * TILE - 20, 'fireball');
                  fb.body.setAllowGravity(false); fb.setVelocity(dir * 180, 0);
                  this.time.delayedCall(2500, () => { if (fb.active) fb.destroy(); });
                });
              }
            }
            this.tweens.add({ targets: b, y: b.homeY, duration: 800, ease: 'Quad.easeOut', onComplete: () => { b.diving = false; } });
          },
        });
      }

      if (now - b.lastShot > 1000) {
        b.lastShot = now; sfx.bossShoot();
        const count = b.hp < b.maxHp * 0.5 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const ang = Math.atan2(dy, dx) + (i - count / 2 + 0.5) * 0.3;
          const fb = this.enemyBullets.create(b.x, b.y + 10, 'fireball');
          fb.body.setAllowGravity(false);
          fb.setVelocity(Math.cos(ang) * 160, Math.sin(ang) * 160);
          this.time.delayedCall(3500, () => { if (fb.active) fb.destroy(); });
        }
      }

    } else if (b.bossType === 'overlord') {
      b.setFlipX(dx < 0);
      b.phaseTimer += this.game.loop.delta;

      if (now - b.lastTeleport > 3500) {
        b.lastTeleport = now;
        const arenaX = this.levelData.bossArenaX;
        const newX = arenaX + TILE * 3 + Math.random() * TILE * 18;
        this.tweens.add({
          targets: b, alpha: 0, duration: 200,
          onComplete: () => {
            b.setPosition(newX, 8 * TILE); b.setVelocity(0, 0);
            this.tweens.add({ targets: b, alpha: 1, duration: 200 });
            sfx.freeze();
            this.spawnExplosion(b.x, b.y, 0x88ccff, 6);
          },
        });
      }

      if (now - b.lastWall > 5000 && b.hp < b.maxHp * 0.7) {
        b.lastWall = now;
        const wallX = Math.round(p.x / TILE) * TILE;
        for (let wy = 9; wy <= 11; wy++) {
          const w = this.iceWalls.create(wallX + TILE / 2, wy * TILE + TILE / 2, 'ice_wall');
          this.time.delayedCall(4000, () => {
            if (w.active) {
              this.tweens.add({
                targets: w, alpha: 0, duration: 500,
                onComplete: () => { w.destroy(); this.iceWalls.refresh(); },
              });
            }
          });
        }
        this.iceWalls.refresh();
        sfx.rawTone(400, 0.2, 'square', 200, 0.08);
      }

      if (now - b.lastShot > 1200) {
        b.lastShot = now; sfx.bossShoot();
        const spread = b.hp < b.maxHp * 0.4 ? 5 : 3;
        for (let i = 0; i < spread; i++) {
          const ang = Math.atan2(dy, dx) + (i - spread / 2 + 0.5) * 0.35;
          const ib = this.enemyBullets.create(b.x, b.y, 'ice_bullet');
          ib.body.setAllowGravity(false);
          ib.setVelocity(Math.cos(ang) * 170, Math.sin(ang) * 170);
          this.time.delayedCall(3500, () => { if (ib.active) ib.destroy(); });
        }
      }
    }
  }

  private defeatBoss() {
    if (!this.bossActive) return;
    this.bossActive = false;
    if (this.boss && this.boss.body) this.boss.body.enable = false;
    [...this.enemyBullets.getChildren()].forEach((b: any) => { if (b.active) b.destroy(); });
    [...this.iceWalls.getChildren()].forEach((w: any) => { if (w.active) w.destroy(); });

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 200, () => {
        if (this.boss && this.boss.active)
          this.spawnExplosion(
            this.boss.x + (Math.random() - 0.5) * 50,
            this.boss.y + (Math.random() - 0.5) * 50,
            [0xff4400, 0xffaa00, 0xff0000, 0xffff00][i % 4], 12,
          );
        this.cameras.main.shake(100, 0.015);
      });
    }

    this.time.delayedCall(1400, () => {
      try { if (this.boss && this.boss.active) this.boss.destroy(); } catch (_) {}
      this.boss = null;
      try {
        if (this.bossHpBar) this.bossHpBar.destroy();
        if (this.bossHpBarBg) this.bossHpBarBg.destroy();
        if (this.bossNameText) this.bossNameText.destroy();
      } catch (_) {}
      this.bossHpBar = null; this.bossHpBarBg = null; this.bossNameText = null;
      this.score += 1000 * (this.currentLevel + 1);
      this.scoreText.setText('SCORE: ' + this.score);

      if (this.currentLevel < LEVELS.length - 1) this.doLevelComplete();
      else this.doVictory();
    });
  }

  // ---- end states ----

  private doLevelComplete() {
    sfx.levelComplete();
    this.cameras.main.flash(500, 0, 255, 100);
    this.time.delayedCall(500, () => {
      this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setScrollFactor(0).setDepth(90);
      this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'LEVEL COMPLETE', {
        fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#00ff88',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.add.text(GAME_W / 2, GAME_H / 2 + 10, `SCORE: ${this.score}  |  KILLS: ${this.kills}`, {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffaa00',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      const nextName = LEVELS[this.currentLevel + 1].name;
      this.add.text(GAME_W / 2, GAME_H / 2 + 35, `NEXT: ${nextName}`, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaaaa',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

      this.time.delayedCall(3000, () => {
        this.scene.restart({
          level: this.currentLevel + 1,
          score: this.score, kills: this.kills,
          lives: this.lives,
          hasDoubleJump: this.player.hasDoubleJump,
          debugMode: this.debugMode,
        });
      });
    });
  }

  private doGameOver() {
    this.gameOver = true;
    this.cameras.main.shake(400, 0.02);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7).setScrollFactor(0).setDepth(90);
    this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'GAME OVER', {
      fontFamily: '"Press Start 2P"', fontSize: '28px', color: '#ff2222',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.add.text(GAME_W / 2, GAME_H / 2 + 10, `LEVEL ${this.currentLevel + 1}: ${this.levelDef.name}`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.add.text(GAME_W / 2, GAME_H / 2 + 30, `SCORE: ${this.score}  |  KILLS: ${this.kills}`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffaa00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    const isTch = navigator.maxTouchPoints > 0;
    const rt = this.add.text(GAME_W / 2, GAME_H / 2 + 60, isTch ? 'TAP TO RESTART' : 'PRESS R TO RESTART', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#00ff88',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: rt, alpha: { from: 1, to: 0.3 }, duration: 500, yoyo: true, repeat: -1 });
  }

  private doVictory() {
    this.victory = true;
    sfx.victory();
    this.cameras.main.flash(800, 0, 255, 100);
    this.time.delayedCall(500, () => {
      this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setScrollFactor(0).setDepth(90);
      const vt = this.add.text(GAME_W / 2, GAME_H / 2 - 60, 'MISSION COMPLETE', {
        fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#00ff88',
        shadow: { offsetX: 2, offsetY: 2, color: '#003322', blur: 0, fill: true },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.tweens.add({ targets: vt, scaleX: { from: 0.9, to: 1.05 }, scaleY: { from: 0.9, to: 1.05 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(GAME_W / 2, GAME_H / 2 - 25, 'ALL LEVELS CLEARED', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      const bonus = this.lives * 500;
      this.score += bonus;
      this.add.text(GAME_W / 2, GAME_H / 2 + 5, `FINAL SCORE: ${this.score}\nKILLS: ${this.kills}\nLIVES LEFT: ${this.lives}`, {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffaa00', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      if (bonus > 0) {
        this.time.delayedCall(1000, () => {
          sfx.powerup();
          this.add.text(GAME_W / 2, GAME_H / 2 + 60, 'LIFE BONUS: +' + bonus, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#44ff44',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        });
      }
      const isTch = navigator.maxTouchPoints > 0;
      const rt = this.add.text(GAME_W / 2, GAME_H / 2 + 90, isTch ? 'TAP TO PLAY AGAIN' : 'PRESS R TO PLAY AGAIN', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#00ff88',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.tweens.add({ targets: rt, alpha: { from: 1, to: 0.3 }, duration: 500, yoyo: true, repeat: -1 });
    });
  }

  // ---- main loop ----

  update(time: number) {
    if (this.restartKey.isDown && (this.gameOver || this.victory)) {
      this.scene.start('GameScene', { level: 0 });
      return;
    }
    if (this.gameOver || this.victory) {
      if (!this._endTime) this._endTime = this.time.now;
      if (this.time.now - this._endTime > 1000 && this.input.activePointer.isDown && !this._tapRestarting) {
        this._tapRestarting = true;
        this.scene.start('GameScene', { level: 0 });
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugBossKey) && !this.bossTriggered) {
      this.debugMode = true;
      this.player.hasDoubleJump = true;
      this.player.airJumpsLeft = 1;
      this.djumpText.setText('✦ DOUBLE JUMP ✦');
      this.djumpText.setAlpha(1);
      this.player.hp = this.player.maxHp;
      this.updateHpDisplay();
      this.lives = MAX_LIVES;
      this.updateLivesDisplay();
      const ax = this.levelData.bossArenaX + 4 * TILE;
      this.player.setPosition(ax, 10 * TILE);
      this.lastSafeX = ax;
      this.lastSafeY = 10 * TILE;
      const dt = this.add.text(GAME_W / 2, GAME_H / 2, `DEBUG: BOSS SKIP (LV${this.currentLevel + 1})`, {
        fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ff00ff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.tweens.add({ targets: dt, alpha: 0, duration: 1500, onComplete: () => dt.destroy() });
    }
    if (this.gameOver || this.victory || this.respawning) return;

    const p = this.player;
    const onGround = p.body.blocked.down;
    const left = this.cursors.left.isDown || this.wasd.left.isDown || touchState.left;
    const right = this.cursors.right.isDown || this.wasd.right.isDown || touchState.right;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up) || touchState.jumpJust;
    touchState.jumpJust = false;

    // movement
    if (p.frozen) {
      p.setVelocityX(p.body.velocity.x * 0.95);
    } else if (this.slippery) {
      const accel = 12, decel = 0.92;
      if (left) { p.body.velocity.x -= accel; p.facing = -1; p.setTexture('player_left'); }
      else if (right) { p.body.velocity.x += accel; p.facing = 1; p.setTexture('player'); }
      else p.body.velocity.x *= decel;
      p.body.velocity.x = Phaser.Math.Clamp(p.body.velocity.x, -PLAYER_SPEED * 1.2, PLAYER_SPEED * 1.2);
    } else {
      if (left) { p.setVelocityX(-PLAYER_SPEED); p.facing = -1; p.setTexture('player_left'); }
      else if (right) { p.setVelocityX(PLAYER_SPEED); p.facing = 1; p.setTexture('player'); }
      else p.setVelocityX(0);
    }

    // jump
    if (onGround) { p.coyoteTimer = COYOTE_TIME; if (p.hasDoubleJump) p.airJumpsLeft = 1; }
    else p.coyoteTimer -= this.game.loop.delta;
    if (jumpPressed) p.jumpBufferTimer = JUMP_BUFFER;
    else p.jumpBufferTimer -= this.game.loop.delta;
    if (!p.frozen) {
      if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
        p.setVelocityY(JUMP_VEL); p.coyoteTimer = 0; p.jumpBufferTimer = 0; sfx.jump();
      } else if (jumpPressed && p.airJumpsLeft > 0 && p.coyoteTimer <= 0) {
        p.setVelocityY(JUMP_VEL * 0.9); p.airJumpsLeft--; p.jumpBufferTimer = 0; sfx.jump();
        this.spawnExplosion(p.x, p.y + 10, 0x44ccff);
      }
    }

    if (this.fireKey.isDown || touchState.shoot) this.fire();
    if (onGround) {
      const dist = Math.abs(p.x - this.lastSafeX);
      if (dist > TILE * 3) {
        this.lastSafeX = p.x - TILE * 2 * p.facing;
        this.lastSafeY = p.y;
      }
    }

    // enemy AI
    this.enemies.getChildren().forEach((en: any) => {
      if (!en.active) return;
      if (en.enemyType === 'grunt') {
        en.patrolTimer += 16;
        if (en.patrolTimer > 2000 + Math.random() * 1000) {
          en.patrolDir *= -1;
          en.setVelocityX(ENEMY_SPEED * en.speedMult * en.patrolDir);
          en.patrolTimer = 0;
        }
        if (en.body.blocked.left || en.body.blocked.right) {
          en.patrolDir *= -1;
          en.setVelocityX(ENEMY_SPEED * en.speedMult * en.patrolDir);
        }
        en.setFlipX(en.patrolDir > 0);
      } else if (en.enemyType === 'shooter') {
        en.setFlipX((this.player.x - en.x) > 0);
        this.enemyShoot(en);
      }
    });

    // boss
    if (!this.bossTriggered && p.x >= this.levelData.bossArenaX + 2 * TILE) this.spawnBoss();
    this.updateBoss();
    if (this.bossTriggered && this.boss && !this.boss.active && this.bossActive) this.bossActive = false;

    // lava hazard
    if (this.lavaY !== null && this.lavaRising) {
      const lavaCap = 8 * TILE;
      if (this.lavaBaseY > lavaCap) this.lavaBaseY -= 0.2;
      const flicker = Math.sin(time * 0.005) * 3;
      this.lavaSprites.forEach((ls) => { ls.y = this.lavaBaseY + flicker; });
      this.lavaFill.y = this.lavaBaseY + TILE / 2;
      this.lavaY = this.lavaBaseY;

      if (this.boss && this.boss.active && this.boss.bossType === 'wyrm') {
        this.boss.homeY = this.lavaBaseY - TILE * 5;
      }
      if (p.y + 11 > this.lavaBaseY) this.damagePlayer();

      if (!this._lastLavaPlatTime) this._lastLavaPlatTime = 0;
      if (time - this._lastLavaPlatTime > 3000) {
        this._lastLavaPlatTime = time;
        const arenaX = this.levelData.bossArenaX;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const px = arenaX + TILE * 3 + Math.random() * TILE * 18;
          const startY = this.lavaBaseY + TILE * 2;
          const peakY = this.lavaBaseY - TILE * 2.5 - Math.random() * TILE * 2;
          const plat = this.platforms.create(px, startY, 'platform') as any;
          plat.setAlpha(0);
          plat.body.checkCollision.down = false;
          plat.body.checkCollision.left = false;
          plat.body.checkCollision.right = false;
          this.platforms.refresh();
          this.tweens.add({
            targets: plat, y: peakY, alpha: 1, duration: 1200, ease: 'Quad.easeOut',
            onComplete: () => {
              this.platforms.refresh();
              this.time.delayedCall(3500, () => {
                if (!plat.active) return;
                this.tweens.add({
                  targets: plat, alpha: { from: 1, to: 0.3 }, duration: 200, yoyo: true, repeat: 3,
                  onComplete: () => {
                    if (!plat.active) return;
                    this.tweens.add({
                      targets: plat, y: this.lavaBaseY + TILE * 2, alpha: 0, duration: 800, ease: 'Quad.easeIn',
                      onComplete: () => { if (plat.active) { plat.destroy(); this.platforms.refresh(); } },
                    });
                  },
                });
              });
            },
          });
        }
      }
    }

    // fall death
    const fallThreshold = this.lavaY !== null ? this.lavaBaseY + TILE * 3 : 550;
    if (p.y > fallThreshold) this.playerDeath();

    // bullet cleanup
    const cL = this.cameras.main.scrollX;
    const cR = cL + GAME_W;
    this.bullets.getChildren().forEach((b: any) => {
      if (b.active && (b.x < cL - 10 || b.x > cR + 10)) b.destroy();
    });
    this.enemyBullets.getChildren().forEach((b: any) => {
      if (b.active && (b.x < cL - 80 || b.x > cR + 80 || b.y < -80 || b.y > GAME_H + 200)) b.destroy();
    });
  }
}
