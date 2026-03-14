import Phaser from 'phaser';
import { TILE, COLS, ROWS, WIDTH, HEIGHT, PLAYER_SPEED, SNEAK_SPEED, CONE_RANGE } from './constants';
import { LEVEL, CAMERAS, findTile } from './level';
import { isPointInCone, buildConePolygon, nearestConeDistance } from './vision';
import type { CameraState } from './types';

const NOISE_RADIUS = 5 * TILE;
const NOISE_SNAP_SPEED = 2.5;

interface Footstep {
  x: number;
  y: number;
  life: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private exitZone!: Phaser.GameObjects.Rectangle;
  private cams: CameraState[] = [];
  private coneGfx!: Phaser.GameObjects.Graphics;
  private alertBar!: Phaser.GameObjects.Graphics;
  private vignetteGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private alert = 0;
  private caught = false;
  private won = false;
  private elapsed = 0;
  private footsteps: Footstep[] = [];
  private footstepTimer = 0;
  private proximity = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.alert = 0;
    this.caught = false;
    this.won = false;
    this.elapsed = 0;
    this.footsteps = [];
    this.footstepTimer = 0;
    this.proximity = 0;

    this.drawMap();
    this.spawnPlayer();
    this.buildCameras();
    this.buildExit();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

    this.trailGfx = this.add.graphics().setDepth(1);
    this.coneGfx = this.add.graphics();
    this.vignetteGfx = this.add.graphics().setDepth(90);
    this.alertBar = this.add.graphics();
    this.hudText = this.add.text(WIDTH / 2, 12, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(100);

    this.timerText = this.add.text(16, 10, '0.0s', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0, 0).setDepth(100);

    this.updateHud();
  }

  update(_time: number, delta: number): void {
    if (this.caught || this.won) return;

    const dt = delta / 1000;
    this.elapsed += dt;
    this.movePlayer(dt);
    this.updateCameras(dt);
    this.applyNoise(dt);
    this.drawTrail(dt);
    this.drawCones();
    this.checkDetection(dt);
    this.drawVignette();
    this.checkExit();
    this.updateHud();
  }

  // ── map ─────────────────────────────────────────────────
  private drawMap(): void {
    const gfx = this.add.graphics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = LEVEL[r][c];
        if (tile === 1) {
          gfx.fillStyle(0x334455);
          gfx.fillRect(c * TILE, r * TILE, TILE, TILE);
          gfx.lineStyle(1, 0x556677);
          gfx.strokeRect(c * TILE, r * TILE, TILE, TILE);
        } else {
          gfx.fillStyle(0x1a1a2e);
          gfx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
    }
  }

  // ── player ──────────────────────────────────────────────
  private spawnPlayer(): void {
    const { col, row } = findTile(2);
    this.player = this.add.circle(
      col * TILE + TILE / 2,
      row * TILE + TILE / 2,
      10,
      0x44dd88,
    ).setDepth(10);
  }

  private movePlayer(dt: number): void {
    const sneaking = this.shiftKey.isDown;
    const speed = sneaking ? SNEAK_SPEED : PLAYER_SPEED;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const moving = vx !== 0 || vy !== 0;

    const nx = this.player.x + vx * speed * dt;
    const ny = this.player.y + vy * speed * dt;
    const r = 10;

    if (!this.hitsWall(nx, this.player.y, r)) this.player.x = nx;
    if (!this.hitsWall(this.player.x, ny, r)) this.player.y = ny;

    this.player.x = Phaser.Math.Clamp(this.player.x, r, WIDTH - r);
    this.player.y = Phaser.Math.Clamp(this.player.y, r, HEIGHT - r);

    this.player.setFillStyle(sneaking ? 0x227744 : 0x44dd88);
    this.player.setRadius(sneaking ? 8 : 10);

    // drop footsteps when running (not sneaking)
    if (moving && !sneaking) {
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.08) {
        this.footstepTimer = 0;
        this.footsteps.push({ x: this.player.x, y: this.player.y, life: 1.0 });
      }
    }
  }

  private hitsWall(x: number, y: number, r: number): boolean {
    const corners: [number, number][] = [
      [x - r, y - r], [x + r, y - r],
      [x - r, y + r], [x + r, y + r],
    ];
    return corners.some(([px, py]) => {
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
      return LEVEL[row][col] === 1;
    });
  }

  // ── exit ────────────────────────────────────────────────
  private buildExit(): void {
    const { col, row } = findTile(3);
    this.exitZone = this.add.rectangle(
      col * TILE + TILE / 2,
      row * TILE + TILE / 2,
      TILE, TILE, 0x44ddff, 0.9,
    ).setDepth(5).setStrokeStyle(2, 0xffffff, 0.8);

    this.tweens.add({
      targets: this.exitZone,
      scaleX: { from: 0.85, to: 1.0 },
      scaleY: { from: 0.85, to: 1.0 },
      alpha: { from: 0.7, to: 1.0 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private checkExit(): void {
    const dx = this.player.x - this.exitZone.x;
    const dy = this.player.y - this.exitZone.y;
    if (Math.abs(dx) < TILE / 2 && Math.abs(dy) < TILE / 2) {
      this.won = true;
      const t = this.elapsed.toFixed(1);
      this.hudText.setText(`ESCAPED in ${t}s! press R to play again`);
      this.player.setFillStyle(0x44bbff);
      this.input.keyboard!.once('keydown-R', () => this.scene.restart());
    }
  }

  // ── cameras ─────────────────────────────────────────────
  private buildCameras(): void {
    this.cams = CAMERAS.map(def => ({
      ...def,
      x: def.col * TILE + TILE / 2,
      y: def.row * TILE + TILE / 2,
      currentAngle: def.baseAngle,
      time: Math.random() * Math.PI * 2,
      detected: false,
    }));

    const gfx = this.add.graphics().setDepth(15);
    this.cams.forEach(cam => {
      gfx.fillStyle(0xff4444);
      gfx.fillCircle(cam.x, cam.y, 5);
      gfx.lineStyle(1, 0xff6666);
      gfx.strokeCircle(cam.x, cam.y, 7);
    });
  }

  private updateCameras(dt: number): void {
    this.cams.forEach(cam => {
      cam.time += dt * cam.speed;
      cam.currentAngle = cam.baseAngle + Math.sin(cam.time) * cam.sweep;
    });
  }

  // ── noise: running near cameras makes them snap toward you ──
  private applyNoise(dt: number): void {
    const sneaking = this.shiftKey.isDown;
    if (sneaking) return;

    const moving = this.cursors.left.isDown || this.cursors.right.isDown ||
      this.cursors.up.isDown || this.cursors.down.isDown ||
      this.wasd.A.isDown || this.wasd.D.isDown ||
      this.wasd.W.isDown || this.wasd.S.isDown;

    if (!moving) return;

    this.cams.forEach(cam => {
      const dx = this.player.x - cam.x;
      const dy = this.player.y - cam.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > NOISE_RADIUS) return;

      const angleToPlayer = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      const diff = Phaser.Math.Angle.ShortestBetween(cam.currentAngle, angleToPlayer);
      const strength = 1 - (dist / NOISE_RADIUS);

      cam.currentAngle += diff * NOISE_SNAP_SPEED * strength * dt;
    });
  }

  // ── footstep trail ──────────────────────────────────────
  private drawTrail(dt: number): void {
    const gfx = this.trailGfx;
    gfx.clear();

    this.footsteps = this.footsteps.filter(f => {
      f.life -= dt * 0.6;
      return f.life > 0;
    });

    this.footsteps.forEach(f => {
      gfx.fillStyle(0x44dd88, f.life * 0.2);
      gfx.fillCircle(f.x, f.y, 2);
    });
  }

  private drawCones(): void {
    const gfx = this.coneGfx;
    gfx.clear();

    this.cams.forEach(cam => {
      const points = buildConePolygon(cam);
      const color = cam.detected ? 0xff2222 : 0xffff44;
      const alpha = cam.detected ? 0.35 : 0.12;

      gfx.fillStyle(color, alpha);
      gfx.beginPath();
      gfx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
      gfx.closePath();
      gfx.fillPath();

      gfx.lineStyle(1, color, alpha + 0.15);
      gfx.beginPath();
      gfx.moveTo(cam.x, cam.y);
      gfx.lineTo(points[1].x, points[1].y);
      gfx.moveTo(cam.x, cam.y);
      gfx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      gfx.strokePath();
    });
  }

  // ── detection ───────────────────────────────────────────
  private checkDetection(dt: number): void {
    let seen = false;

    // compute proximity (how close to any cone edge)
    this.proximity = this.cams.reduce((closest, cam) => {
      const d = nearestConeDistance(this.player.x, this.player.y, cam);
      return Math.min(closest, d);
    }, Infinity);

    this.cams.forEach(cam => {
      cam.detected = isPointInCone(this.player.x, this.player.y, cam);
      if (cam.detected) seen = true;
    });

    if (seen) {
      this.alert = Math.min(1, this.alert + dt * 0.8);
      if (this.alert >= 1) {
        this.caught = true;
        this.player.setFillStyle(0xff0000);
        const t = this.elapsed.toFixed(1);
        this.hudText.setText(`DETECTED at ${t}s! press R to retry`);
        this.input.keyboard!.once('keydown-R', () => this.scene.restart());
      }
    } else {
      this.alert = Math.max(0, this.alert - dt * 0.5);
    }
  }

  // ── proximity vignette ─────────────────────────────────
  private drawVignette(): void {
    const gfx = this.vignetteGfx;
    gfx.clear();

    // proximity warning: glow red edges when close to a cone
    const dangerDist = CONE_RANGE * 0.6;
    if (this.proximity < dangerDist) {
      const intensity = 1 - (this.proximity / dangerDist);
      const alpha = intensity * 0.3;
      const thickness = 8 + intensity * 24;

      gfx.fillStyle(0xff2222, alpha);
      // top
      gfx.fillRect(0, 0, WIDTH, thickness);
      // bottom
      gfx.fillRect(0, HEIGHT - thickness, WIDTH, thickness);
      // left
      gfx.fillRect(0, 0, thickness, HEIGHT);
      // right
      gfx.fillRect(WIDTH - thickness, 0, thickness, HEIGHT);
    }
  }

  // ── hud ─────────────────────────────────────────────────
  private updateHud(): void {
    const bar = this.alertBar;
    bar.clear();
    bar.setDepth(100);

    const barW = 120;
    const barH = 8;
    const bx = WIDTH - barW - 16;
    const by = 10;

    bar.fillStyle(0x222222, 0.8);
    bar.fillRect(bx, by, barW, barH);

    const color = this.alert > 0.6 ? 0xff2222 : this.alert > 0.3 ? 0xffaa22 : 0x44dd88;
    bar.fillStyle(color);
    bar.fillRect(bx, by, barW * this.alert, barH);

    bar.lineStyle(1, 0x888888);
    bar.strokeRect(bx, by, barW, barH);

    this.timerText.setText(this.elapsed.toFixed(1) + 's');

    if (!this.caught && !this.won) {
      this.hudText.setText('WASD/arrows · SHIFT to sneak (silent) · reach the exit');
    }
  }
}
