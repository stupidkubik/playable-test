import test from "node:test";
import assert from "node:assert/strict";

import {
  collectibleIntersects,
  computeFinishGateGeometry,
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

test("computeFinishGateGeometry returns stable trigger line and bounds", () => {
  const finish = { x: 1000, tapeBroken: false };
  const geometry = computeFinishGateGeometry(finish, 900);

  assert.ok(geometry);
  assert.ok(geometry.bounds);
  assert.ok(geometry.bounds.width > 700);
  assert.ok(geometry.bounds.maxX > finish.x);
  assert.ok(geometry.bounds.minX < finish.x - 300);
  assert.ok(Math.abs(geometry.tape.breakLineX - (finish.x - 312)) < 2);
});

test("computeFinishGateGeometry trigger line shifts with anchor and is independent from broken state", () => {
  const base = computeFinishGateGeometry({ x: 1200, tapeBroken: false }, 900);
  const shifted = computeFinishGateGeometry({ x: 1320, tapeBroken: false }, 900);
  const broken = computeFinishGateGeometry({ x: 1200, tapeBroken: true }, 900);

  assert.ok(base);
  assert.ok(shifted);
  assert.ok(broken);
  assert.equal(Math.round(shifted.tape.breakLineX - base.tape.breakLineX), 120);
  assert.equal(Math.round(broken.tape.breakLineX), Math.round(base.tape.breakLineX));
});

test("computeFinishGateGeometry animates broken tape pieces with intermediate progress", () => {
  const intact = computeFinishGateGeometry({ x: 1000, tapeBroken: false, tapeBreakProgress: 0 }, 900);
  const mid = computeFinishGateGeometry({ x: 1000, tapeBroken: true, tapeBreakProgress: 0.35 }, 900);
  const broken = computeFinishGateGeometry({ x: 1000, tapeBroken: true, tapeBreakProgress: 1 }, 900);

  assert.ok(intact && mid && broken);
  assert.notEqual(Math.round(mid.sprites.leftTape.rotation * 1000), Math.round(intact.sprites.leftTape.rotation * 1000));
  assert.notEqual(Math.round(mid.sprites.rightTape.rotation * 1000), Math.round(broken.sprites.rightTape.rotation * 1000));
  assert.equal(Math.round(mid.sprites.leftTape.x), Math.round(intact.sprites.leftTape.x));
  assert.equal(Math.round(mid.sprites.leftTape.y), Math.round(intact.sprites.leftTape.y));
});
