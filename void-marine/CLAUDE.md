# Void Marine

side-scrolling run-and-gun built with phaser 3 + typescript.

## architecture

- `src/void-marine/main.ts` — phaser game bootstrap + touch init
- `src/void-marine/GameScene.ts` — main game scene (player, enemies, boss fights, lava, etc)
- `src/void-marine/TitleScene.ts` — title screen with level select
- `src/void-marine/levelgen.ts` — procedural level generation (ground, pits, platforms, enemies, powerups, boss arena)
- `src/void-marine/levels.ts` — level definitions, boss names/HP, type definitions
- `src/void-marine/constants.ts` — game dimensions, physics tuning values
- `src/void-marine/textures.ts` — runtime texture generation for all sprites
- `src/void-marine/sfx.ts` — web audio synthesizer for all sound effects
- `src/void-marine/touch.ts` — touch control state and setup

## mechanics

- 3 themed worlds: void station, lava depths, ice citadel
- side-scrolling platformer with shooting
- boss fights per level (mech, brute, drone, wyrm, overlord)
- powerups (double jump), lives system, slippery ice physics
- coyote time + jump buffering for responsive platforming
- touch controls for mobile

## controls

- WASD / arrows: move & jump
- SPACE: shoot
- R: restart
- B: debug skip to boss
- 1/2/3: debug start on level (from title)

## tests

- `src/void-marine/__tests__/constants.test.ts` — validates game constants
- `src/void-marine/__tests__/levels.test.ts` — validates level/boss definitions
- `src/void-marine/__tests__/levelgen.test.ts` — tests procedural level generation
- run with `pnpm test`
