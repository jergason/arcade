export class SFX {
  private ctx: AudioContext;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private _play(
    f: number,
    d: number,
    t: OscillatorType = 'square',
    fe: number | null = null,
    v = 0.15,
  ) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, this.ctx.currentTime);
    if (fe !== null)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(fe, 20),
        this.ctx.currentTime + d,
      );
    g.gain.setValueAtTime(v, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + d);
  }

  shoot() {
    this._play(880, 0.08, 'square', 440, 0.1);
  }
  hit() {
    this._play(200, 0.15, 'sawtooth', 80, 0.12);
  }
  enemyDie() {
    this._play(300, 0.1, 'square', 100, 0.1);
    setTimeout(() => this._play(150, 0.15, 'sawtooth', 40, 0.1), 50);
  }
  playerHit() {
    this._play(150, 0.3, 'sawtooth', 30, 0.2);
    setTimeout(() => this._play(100, 0.2, 'square', 20, 0.15), 100);
  }
  jump() {
    this._play(250, 0.1, 'square', 500, 0.08);
  }
  death() {
    for (let i = 0; i < 5; i++)
      setTimeout(
        () => this._play(200 - i * 30, 0.2, 'sawtooth', 30, 0.15),
        i * 80,
      );
  }
  powerup() {
    this._play(440, 0.1, 'square', 880, 0.1);
    setTimeout(() => this._play(660, 0.1, 'square', 1320, 0.1), 100);
    setTimeout(() => this._play(880, 0.15, 'square', 1760, 0.1), 200);
  }
  bossHit() {
    this._play(100, 0.2, 'sawtooth', 50, 0.2);
  }
  bossShoot() {
    this._play(180, 0.15, 'sawtooth', 90, 0.1);
  }
  bossSlam() {
    this._play(60, 0.4, 'sawtooth', 20, 0.25);
    setTimeout(() => this._play(40, 0.3, 'square', 15, 0.2), 150);
  }
  victory() {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => this._play(f, 0.2, 'square', f * 1.5, 0.12), i * 150),
    );
  }
  levelComplete() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._play(f, 0.15, 'square', f * 1.2, 0.1), i * 120),
    );
  }
  lavaWarn() {
    this._play(80, 0.5, 'sawtooth', 40, 0.1);
  }
  freeze() {
    this._play(1200, 0.2, 'sine', 600, 0.08);
    setTimeout(() => this._play(800, 0.15, 'sine', 400, 0.06), 100);
  }
  rawTone(f: number, d: number, t: OscillatorType, fe: number, v: number) {
    this._play(f, d, t, fe, v);
  }
}

export const sfx = new SFX();
