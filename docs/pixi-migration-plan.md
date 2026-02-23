# Pixi.js Migration Plan (Functional Parity First)

## Goal
- Migrate rendering from Canvas 2D to Pixi.js.
- Keep gameplay logic stable (`/Users/evgenii/Desktop/playable/test/src/gameLogic.js`).
- Reach functional parity first, visual polish later.

## Current State
- Runtime is vanilla JS + Canvas 2D + DOM overlays.
- Core game loop/state lives in `/Users/evgenii/Desktop/playable/test/src/game.js`.
- Extracted media is embedded in `/Users/evgenii/Desktop/playable/test/src/assets/extractedAssets.js`.
- Build pipeline (`/Users/evgenii/Desktop/playable/test/scripts/build-single-html.mjs`) is a manual concatenation step and currently does not bundle arbitrary extra JS modules.

## Migration Principles
- Replace the renderer, not the game rules.
- Keep `state`, collisions, spawn timing, jump logic unchanged on early stages.
- Preserve DOM overlays (`start/win/lose`) until the Pixi scene is stable.
- Validate parity per scene/state (not only by a general "looks fine").

## Stages

### 1. Baseline + Parity Checklist
- Capture reference scenes:
- `intro`
- `tutorial pause`
- `running`
- `jump`
- `hurt/invincibility`
- `finish break`
- `win`
- `lose`
- Use screenshots/videos to compare after each migration stage.

### 2. Renderer Abstraction (No Pixi Yet)
- Introduce a renderer facade in `/Users/evgenii/Desktop/playable/test/src/game.js`:
- `init()`
- `render(elapsedSeconds)`
- `destroy()`
- Keep the current Canvas draw pipeline behind the facade.
- Add a backend switch (`canvas` / `pixi`) with a safe fallback to canvas.

### 3. Pixi Infrastructure
- Add Pixi.js dependency.
- Create a Pixi app and mount its canvas into the existing container.
- Add render layers/containers:
- `sky`
- `decor`
- `ground`
- `collectibles`
- `obstacles`
- `finish`
- `enemies`
- `player`
- `fx`
- `tutorialHint`

### 4. Resource Loading for Pixi
- Convert extracted `data:image/...` assets to Pixi textures.
- Build frame helpers for `playerSheet` / `enemySheet` using current frame metadata.
- Reuse existing frame offsets (`sourceX/sourceY/sourceW/sourceH`) to avoid regressions.

### 5. Static Scene Migration
- Port background/sky scrolling.
- Port scene decor (trees, lamps, bushes, including `sceneBushMedium`).
- Verify tile mirroring and scrolling speed.

### 6. Entity Rendering Migration
- Port player, enemies, obstacles, collectibles, finish line to Pixi sprites.
- Keep gameplay update/state logic unchanged.
- Validate positions/anchors first, polish later.

### 7. Tutorial / End-State Parity
- Preserve tutorial pause behavior:
- player in idle pose
- frozen enemy animation
- pulsing hand
- Preserve `win/lose` behavior:
- player resets to start/idle

### 8. FX Migration
- Port hurt red flash (Pixi tint/mask/filter approach).
- Port finish confetti (`confettiParticle1..6`) using Pixi sprites/emitter logic.
- Keep timings/angles from current restored behavior.

### 9. Ticker / Loop Decision
- Phase 1: keep current `requestAnimationFrame` game loop and call Pixi renderer from it.
- Phase 2 (optional): move rendering cadence to `app.ticker` after parity is stable.

### 10. Regression Pass
- Validate all baseline scenes and interactions.
- Mobile/desktop layout check with DOM overlays over Pixi canvas.

### 11. Bundle Size Optimization (After Working Pixi)
- Rework build pipeline for proper bundling/tree-shaking (important for Pixi).
- Re-check exact final bundle size limits.
- Only optimize once behavior is stable.

### 12. Final Polish (Last)
- Visual alignment, anchors, masks, timing tweaks, layering polish.

## Immediate Next Steps (This Session)
1. Add renderer facade + backend switch in `/Users/evgenii/Desktop/playable/test/src/game.js` (canvas remains active).
2. Keep behavior identical.
3. After that, prepare build script changes so extra renderer modules can be introduced safely.
