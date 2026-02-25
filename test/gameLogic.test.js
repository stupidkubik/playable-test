import test from "node:test";
import assert from "node:assert/strict";

import {
  collectibleIntersects,
  computeJumpY,
  intersects,
  nextSpawnDelay,
  obstacleSpeed,
  scoreStep,
  shouldSpawn,
  spawnDistanceToPx
} from "../src/gameLogic.js";

test("intersects returns true when rectangles overlap", () => {
  const a = { x: 20, y: 20, width: 60, height: 60 };
  const b = { x: 50, y: 40, width: 40, height: 70 };

  assert.equal(intersects(a, b), true);
});

test("intersects returns false when rectangles do not overlap", () => {
  const a = { x: 10, y: 10, width: 20, height: 20 };
  const b = { x: 40, y: 40, width: 10, height: 10 };

  assert.equal(intersects(a, b), false);
});

test("spawn delay decreases with score and keeps min cap", () => {
  assert.equal(nextSpawnDelay(0), 1.65);
  assert.equal(nextSpawnDelay(40), 1.25);
  assert.equal(nextSpawnDelay(400), 0.72);
});

test("obstacle speed scales with score and keeps max cap", () => {
  assert.equal(obstacleSpeed(0), 360);
  assert.equal(obstacleSpeed(50), 480);
  assert.equal(obstacleSpeed(200), 580);
});

test("score step is proportional to dt and speed", () => {
  assert.equal(scoreStep(0.5, 400), 10);
  assert.equal(scoreStep(1, 360), 18);
});

test("spawn distance and spawn check accept runtime metrics overrides", () => {
  const distancePx = spawnDistanceToPx(2, { worldWidth: 900 });
  assert.equal(distancePx, 1800);

  assert.equal(shouldSpawn(distancePx, 950), false);
  assert.equal(shouldSpawn(distancePx, 950, { spawnLeadViewportWidth: 900 }), true);
});

test("computeJumpY uses custom jump height from runtime metrics", () => {
  const startY = 1000;

  assert.equal(computeJumpY(startY, 0.5), 700);
  assert.equal(computeJumpY(startY, 0.5, { jumpHeight: 120 }), 880);
});

test("collectibleIntersects accepts custom collectible radius", () => {
  const playerBox = { x: 100, y: 100, width: 40, height: 40 };
  const collectible = { x: 165, y: 105, width: 20, height: 20 };

  assert.equal(collectibleIntersects(playerBox, collectible), true);
  assert.equal(collectibleIntersects(playerBox, collectible, { collectibleRadius: 20 }), false);
});
