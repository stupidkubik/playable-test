# Pixi Parity Checklist

Open: `http://127.0.0.1:5173/?renderer=pixi`

## 1. Boot / Intro
- Start screen appears as before.
- Tap starts the game.
- No console errors.
- Input works (tap / space).

## 2. Running Scene
- Background scrolls smoothly.
- Decor (trees / lamps / bushes, including medium bush) moves correctly.
- Player run animation is visible.
- Enemies animate and move without jitter.
- Obstacles and collectibles are visible and positioned correctly.

## 3. Jump / Hurt
- Jump triggers reliably.
- Hurt red flash is applied only to the player sprite.
- Jump animation still shows during invincibility.

## 4. Tutorial Pause
- First enemy triggers pause.
- Player switches to idle pose.
- Enemy is frozen (position + animation frame).
- Tutorial hint panel and pulsing hand are visible.
- Tap resumes and triggers jump.

## 5. Finish
- Finish line renders (poles / tape / floor).
- Tape breaks on crossing.
- Deceleration starts.
- Confetti bursts from both sides.
- No freezes or major frame drops.

## 6. Win / Lose
- Player is in idle pose on win and lose.
- DOM overlays render above Pixi correctly.
- CTA buttons work.
- Restart resets scene without artifacts.

## 7. Layering / Regression
- HUD is not hidden by Pixi layers.
- Tutorial hint is not visible during normal running.
- Confetti does not break overlay readability.
- Multiple restarts do not duplicate layers/canvases.

## 8. Fallback
- Open `/` (without `renderer=pixi`) and confirm canvas mode still works.
- If Pixi fails to load, app falls back to canvas without crash.
