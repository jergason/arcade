# camera-sneak

metal gear solid-style stealth game where you dodge sweeping security cameras to reach the exit. built with phaser 3.

## play

```
pnpm install
pnpm dev
```

## controls

- **WASD / arrow keys** — move
- **SHIFT** — sneak (slower, but silent)
- **R** — restart after win/loss

## mechanics

- **vision cones** — cameras sweep back and forth with raycasted line-of-sight. walls block their vision.
- **noise** — running near a camera makes it snap toward you. sneaking is silent.
- **proximity warning** — screen edges glow red when you're dangerously close to a cone.
- **footstep trail** — faint dots trail behind you when running, invisible when sneaking.
- **alert bar** — fills when spotted. full bar = caught.
- **speedrun timer** — tracks your escape time.
