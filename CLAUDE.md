# Arcade

browser games built with phaser 3 + typescript. vite multi-page build, deployed to github pages.

## games

- `src/camera-sneak/` — stealth game (dodge security cameras)
- `src/void-marine/` — side-scrolling run-and-gun (3 worlds, 5 bosses)

each has its own `CLAUDE.md` with full architecture docs.

## commands

- `pnpm dev` — start dev server
- `pnpm build` — production build to `dist/`
- `pnpm test` — run vitest

## structure

- `index.html` — landing page
- `camera-sneak/index.html` — camera sneak entry point
- `void-marine/index.html` — void marine entry point
- `src/` — all game source code
- `vite.config.ts` — multi-page build config, base path `/arcade/` in prod
