export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const PLAYER_CONFIG = Object.freeze({
  xPosition: 0.1,
  groundOffset: 280,
  jumpHeight: 300,
  jumpDurationMs: 800,
  invincibilityMs: 500,
  scale: 0.756,
  animationSpeed: 0.15
});

export const SPEED_CONFIG = Object.freeze({
  base: 600,
  enemyChaseBoost: 300,
  decelerationRate: 0.9,
  minSpeed: 10,
  tutorialPauseDistance: 300
});

export const HITBOX_CONFIG = Object.freeze({
  playerScaleX: 0.25,
  playerScaleY: 0.7,
  playerOffsetX: 0,
  playerOffsetY: -0.15,
  enemyScaleX: 0.3,
  enemyScaleY: 0.5,
  enemyOffsetX: 0,
  enemyOffsetY: 0.2,
  obstacleShrink: 10,
  collectibleRadius: 60
});

export const ECONOMY_CONFIG = Object.freeze({
  dollarValue: 20,
  paypalCardMin: 5,
  paypalCardMax: 50,
  startBalance: 0,
  maxHp: 3
});

export const FINISH_CONFIG = Object.freeze({
  tapeBreakAnimationMs: 1480
});

export const STATES = Object.freeze({
  loading: "loading",
  intro: "intro",
  running: "running",
  paused: "paused",
  endWin: "end_win",
  endLose: "end_lose"
});

export const SPAWN_SEQUENCE = Object.freeze([
  { type: "collectible", distance: 1 },
  { type: "collectible", distance: 2 },
  { type: "enemy", distance: 3, pauseForTutorial: true },
  { type: "collectible", distance: 4, yOffset: 50 },
  { type: "collectible", distance: 4.2, yOffset: 150 },
  { type: "collectible", distance: 4.4, yOffset: 250 },
  { type: "collectible", distance: 4.6, yOffset: 150 },
  { type: "collectible", distance: 4.8, yOffset: 50 },
  { type: "obstacle", distance: 5.6, warningLabel: true },
  { type: "collectible", distance: 6.4 },
  { type: "enemy", distance: 7 },
  { type: "collectible", distance: 7.6 },
  { type: "collectible", distance: 7.8, yOffset: 100 },
  { type: "collectible", distance: 8, yOffset: 200 },
  { type: "collectible", distance: 8.2, yOffset: 280 },
  { type: "collectible", distance: 8.4, yOffset: 200 },
  { type: "collectible", distance: 8.6, yOffset: 100 },
  { type: "obstacle", distance: 9, warningLabel: true },
  { type: "collectible", distance: 9.6 },
  { type: "enemy", distance: 10 },
  { type: "collectible", distance: 10.6 },
  { type: "collectible", distance: 11, yOffset: 80 },
  { type: "collectible", distance: 11.2, yOffset: 180 },
  { type: "collectible", distance: 11.4, yOffset: 80 },
  { type: "obstacle", distance: 12, warningLabel: true },
  { type: "enemy", distance: 12.6 },
  { type: "collectible", distance: 13 },
  { type: "collectible", distance: 13.2, yOffset: 100 },
  { type: "collectible", distance: 13.4, yOffset: 200 },
  { type: "collectible", distance: 13.6, yOffset: 100 },
  { type: "obstacle", distance: 14, warningLabel: true },
  { type: "collectible", distance: 14.5 },
  { type: "enemy", distance: 15 },
  { type: "collectible", distance: 15.4, yOffset: 80 },
  { type: "collectible", distance: 15.6, yOffset: 180 },
  { type: "collectible", distance: 15.8, yOffset: 260 },
  { type: "collectible", distance: 16, yOffset: 180 },
  { type: "collectible", distance: 16.2, yOffset: 80 },
  { type: "obstacle", distance: 16.5, warningLabel: true },
  { type: "finish", distance: 18 }
]);

function metricOrDefault(metrics, key, fallback) {
  const value = metrics?.[key];
  return Number.isFinite(value) ? value : fallback;
}

const FINISH_ASSET_DIMENSIONS = Object.freeze({
  finishFloorPattern: Object.freeze({ width: 382, height: 51 }),
  finishPoleLeft: Object.freeze({ width: 102, height: 8 }),
  finishPoleRight: Object.freeze({ width: 135, height: 13 }),
  finishTapeLeft: Object.freeze({ width: 40, height: 20 }),
  finishTapeRight: Object.freeze({ width: 46, height: 23 })
});

const FINISH_LAYOUT = Object.freeze({
  floorScale: 2,
  floorGroundOffsetY: 84,
  polesGroundOffsetY: 100,
  leftPoleScale: 1.8,
  rightPoleScale: 1.35,
  leftPoleBottomXOffset: -360,
  rightPoleBottomXOffset: -240,
  leftPoleBottomYOffset: -36,
  rightPoleBottomYOffset: 22,
  poleRotation: -Math.PI / 2,
  tapeScaleX: 1.8,
  tapeScaleY: 1,
  leftTapeAnchorYOffsetFromPoleTop: 40,
  rightTapeAnchorXOffsetFromPoleBottom: -24,
  rightTapeAnchorYOffsetFromPoleTop: 58,
  leftTapeRotation: 0.4,
  rightTapeRotation: -2.5,
  leftTapeBrokenRotation: 1.28,
  rightTapeBrokenRotation: -3.42,
  leftTapeBreakWobbleRotation: 0.12,
  rightTapeBreakWobbleRotation: -0.14,
  leftTapeBreakDropY: 0,
  rightTapeBreakDropY: 0,
  leftTapeBreakDriftX: 0,
  rightTapeBreakDriftX: 0,
  leftTapeBreakWobbleDropY: 0,
  rightTapeBreakWobbleDropY: 0,
  leftTapeBreakWobbleDriftX: 0,
  rightTapeBreakWobbleDriftX: 0,
  tapeBreakWobbleCycles: 1.05
});

function finishImageDimension(images, key, axis) {
  const value = images?.[key]?.[axis];
  const fallback = FINISH_ASSET_DIMENSIONS[key]?.[axis];
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createSpriteGeometry({
  x,
  y,
  width,
  height,
  rotation = 0,
  anchorX = 0,
  anchorY = 0
}) {
  return {
    x,
    y,
    width,
    height,
    rotation,
    anchorX,
    anchorY
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const clamped = clamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function easeOutQuad(t) {
  const clamped = clamp(t, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

function easeOutSine(t) {
  const clamped = clamp(t, 0, 1);
  return Math.sin((clamped * Math.PI) / 2);
}

function easeInOutSine(t) {
  const clamped = clamp(t, 0, 1);
  return -(Math.cos(Math.PI * clamped) - 1) / 2;
}

function interpolateKeyframes(keyframes, t) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return 0;
  }

  const clampedT = clamp(t, 0, 1);
  const first = keyframes[0];
  if (clampedT <= first.t) {
    return first.value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const prev = keyframes[index - 1];
    const next = keyframes[index];
    if (clampedT <= next.t) {
      const span = Math.max(1e-6, next.t - prev.t);
      const localT = (clampedT - prev.t) / span;
      return lerp(prev.value, next.value, easeInOutSine(localT));
    }
  }

  return keyframes[keyframes.length - 1].value;
}

function dampedOscillation(t, amplitude, cycles) {
  if (t <= 0 || t >= 1 || amplitude === 0) {
    return 0;
  }
  const envelope = Math.pow(1 - t, 1.15);
  return Math.sin(t * Math.PI * 2 * cycles) * amplitude * envelope;
}

function finishTapeBreakProgress(finish) {
  if (!finish?.tapeBroken) {
    return 0;
  }
  if (Number.isFinite(finish?.tapeBreakProgress)) {
    return clamp(finish.tapeBreakProgress, 0, 1);
  }
  return 1;
}

function spritePointToWorld(sprite, localX, localY) {
  const width = sprite.width;
  const height = sprite.height;
  const anchorOffsetX = width * (sprite.anchorX ?? 0);
  const anchorOffsetY = height * (sprite.anchorY ?? 0);
  const dx = localX - anchorOffsetX;
  const dy = localY - anchorOffsetY;
  const rotation = sprite.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: sprite.x + dx * cos - dy * sin,
    y: sprite.y + dx * sin + dy * cos
  };
}

function spriteAabb(sprite) {
  const p1 = spritePointToWorld(sprite, 0, 0);
  const p2 = spritePointToWorld(sprite, sprite.width, 0);
  const p3 = spritePointToWorld(sprite, sprite.width, sprite.height);
  const p4 = spritePointToWorld(sprite, 0, sprite.height);
  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function unionAabbs(boundsList) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of boundsList) {
    if (!bounds) {
      continue;
    }
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function computeFinishGateGeometry(finish, groundY, images = null) {
  const anchorX = Number.isFinite(finish?.x) ? finish.x : Number.isFinite(finish?.anchorX) ? finish.anchorX : NaN;
  if (!Number.isFinite(anchorX) || !Number.isFinite(groundY)) {
    return null;
  }

  const floorWidth = finishImageDimension(images, "finishFloorPattern", "width") * FINISH_LAYOUT.floorScale;
  const floorHeight = finishImageDimension(images, "finishFloorPattern", "height") * FINISH_LAYOUT.floorScale;
  const leftPoleWidth = finishImageDimension(images, "finishPoleLeft", "width") * FINISH_LAYOUT.leftPoleScale;
  const leftPoleHeight = finishImageDimension(images, "finishPoleLeft", "height") * FINISH_LAYOUT.leftPoleScale;
  const rightPoleWidth = finishImageDimension(images, "finishPoleRight", "width") * FINISH_LAYOUT.rightPoleScale;
  const rightPoleHeight = finishImageDimension(images, "finishPoleRight", "height") * FINISH_LAYOUT.rightPoleScale;
  const leftTapeWidth = finishImageDimension(images, "finishTapeLeft", "width") * FINISH_LAYOUT.tapeScaleX;
  const leftTapeHeight = finishImageDimension(images, "finishTapeLeft", "height") * FINISH_LAYOUT.tapeScaleY;
  const rightTapeWidth = finishImageDimension(images, "finishTapeRight", "width") * FINISH_LAYOUT.tapeScaleX;
  const rightTapeHeight = finishImageDimension(images, "finishTapeRight", "height") * FINISH_LAYOUT.tapeScaleY;

  const leftPoleBottomX = anchorX + FINISH_LAYOUT.leftPoleBottomXOffset;
  const rightPoleBottomX = anchorX + FINISH_LAYOUT.rightPoleBottomXOffset;
  const polesBottomY = groundY - FINISH_LAYOUT.polesGroundOffsetY;
  const leftPoleBottomY = polesBottomY + FINISH_LAYOUT.leftPoleBottomYOffset;
  const rightPoleBottomY = polesBottomY + FINISH_LAYOUT.rightPoleBottomYOffset;

  const floorSprite = createSpriteGeometry({
    x: anchorX - floorWidth * 0.5,
    y: groundY - FINISH_LAYOUT.floorGroundOffsetY,
    width: floorWidth,
    height: floorHeight
  });
  const leftPoleSprite = createSpriteGeometry({
    x: leftPoleBottomX,
    y: leftPoleBottomY,
    width: leftPoleWidth,
    height: leftPoleHeight,
    rotation: FINISH_LAYOUT.poleRotation,
    anchorX: 0.5,
    anchorY: 1
  });
  const rightPoleSprite = createSpriteGeometry({
    x: rightPoleBottomX,
    y: rightPoleBottomY,
    width: rightPoleWidth,
    height: rightPoleHeight,
    rotation: FINISH_LAYOUT.poleRotation,
    anchorX: 0.5,
    anchorY: 1
  });
  const leftPoleBounds = spriteAabb(leftPoleSprite);
  const rightPoleBounds = spriteAabb(rightPoleSprite);
  const tapeBreakProgress = finishTapeBreakProgress(finish);
  const leftTapeRotation = interpolateKeyframes(
    [
      { t: 0, value: FINISH_LAYOUT.leftTapeRotation },
      { t: 0.12, value: FINISH_LAYOUT.leftTapeRotation },
      { t: 0.28, value: FINISH_LAYOUT.leftTapeRotation + 0.28 },
      { t: 0.5, value: FINISH_LAYOUT.leftTapeBrokenRotation + 0.55 },
      { t: 0.72, value: FINISH_LAYOUT.leftTapeBrokenRotation + 0.14 },
      { t: 0.88, value: FINISH_LAYOUT.leftTapeBrokenRotation - 0.08 },
      { t: 1, value: FINISH_LAYOUT.leftTapeBrokenRotation }
    ],
    tapeBreakProgress
  );
  const rightTapeRotation = interpolateKeyframes(
    [
      { t: 0, value: FINISH_LAYOUT.rightTapeRotation },
      { t: 0.12, value: FINISH_LAYOUT.rightTapeRotation },
      { t: 0.28, value: FINISH_LAYOUT.rightTapeRotation - 0.3 },
      { t: 0.52, value: FINISH_LAYOUT.rightTapeBrokenRotation - 0.5 },
      { t: 0.74, value: FINISH_LAYOUT.rightTapeBrokenRotation - 0.12 },
      { t: 0.89, value: FINISH_LAYOUT.rightTapeBrokenRotation + 0.08 },
      { t: 1, value: FINISH_LAYOUT.rightTapeBrokenRotation }
    ],
    tapeBreakProgress
  );
  const leftTapeAnchorBaseX = leftPoleBottomX;
  const leftTapeAnchorBaseY = leftPoleBounds.minY + FINISH_LAYOUT.leftTapeAnchorYOffsetFromPoleTop;
  const rightTapeAnchorBaseX = rightPoleBottomX + FINISH_LAYOUT.rightTapeAnchorXOffsetFromPoleBottom;
  const rightTapeAnchorBaseY = rightPoleBounds.minY + FINISH_LAYOUT.rightTapeAnchorYOffsetFromPoleTop;
  const leftTapeAnchorX = leftTapeAnchorBaseX;
  const leftTapeAnchorY = leftTapeAnchorBaseY;
  const rightTapeAnchorX = rightTapeAnchorBaseX;
  const rightTapeAnchorY = rightTapeAnchorBaseY;

  const leftTapeSprite = createSpriteGeometry({
    x: leftTapeAnchorX,
    y: leftTapeAnchorY,
    width: leftTapeWidth,
    height: leftTapeHeight,
    rotation: leftTapeRotation,
    anchorX: 0,
    anchorY: 0
  });
  const rightTapeSprite = createSpriteGeometry({
    x: rightTapeAnchorX,
    y: rightTapeAnchorY,
    width: rightTapeWidth,
    height: rightTapeHeight,
    rotation: rightTapeRotation,
    anchorX: 0,
    anchorY: 0
  });

  const leftTapeTriggerSprite = {
    ...leftTapeSprite,
    x: leftTapeAnchorBaseX,
    y: leftTapeAnchorBaseY,
    rotation: FINISH_LAYOUT.leftTapeRotation
  };
  const rightTapeTriggerSprite = {
    ...rightTapeSprite,
    x: rightTapeAnchorBaseX,
    y: rightTapeAnchorBaseY,
    rotation: FINISH_LAYOUT.rightTapeRotation
  };
  const leftTapeJoin = spritePointToWorld(leftTapeTriggerSprite, leftTapeTriggerSprite.width, 0);
  const rightTapeJoin = spritePointToWorld(rightTapeTriggerSprite, rightTapeTriggerSprite.width, 0);
  const tapeBreakLineX = (leftTapeJoin.x + rightTapeJoin.x) * 0.5;
  const tapeBreakLineY = (leftTapeJoin.y + rightTapeJoin.y) * 0.5;

  const bounds = unionAabbs([
    spriteAabb(floorSprite),
    spriteAabb(leftPoleSprite),
    spriteAabb(rightPoleSprite),
    spriteAabb(leftTapeSprite),
    spriteAabb(rightTapeSprite)
  ]);

  return {
    anchorX,
    groundY,
    sprites: {
      floor: floorSprite,
      leftPole: leftPoleSprite,
      rightPole: rightPoleSprite,
      leftTape: leftTapeSprite,
      rightTape: rightTapeSprite
    },
    tape: {
      breakLineX: tapeBreakLineX,
      breakLineY: tapeBreakLineY,
      leftJoin: leftTapeJoin,
      rightJoin: rightTapeJoin
    },
    bounds
  };
}

export function spawnDistanceToPx(distance, metrics = null) {
  const worldWidth = metricOrDefault(metrics, "worldWidth", GAME_WIDTH);
  return distance * worldWidth;
}

export function shouldSpawn(distancePx, traveledPx, metrics = null) {
  const leadWidth = metricOrDefault(
    metrics,
    "spawnLeadViewportWidth",
    metricOrDefault(metrics, "worldWidth", GAME_WIDTH)
  );
  return traveledPx >= distancePx - leadWidth;
}

export function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function computeJumpY(startY, progress, metrics = null) {
  const jumpHeight = metricOrDefault(metrics, "jumpHeight", PLAYER_CONFIG.jumpHeight);
  const lift = Math.sin(progress * Math.PI) * jumpHeight;
  return startY - lift;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function playerHitbox(player, metrics = null) {
  const scaleX = metricOrDefault(metrics, "playerHitboxScaleX", HITBOX_CONFIG.playerScaleX);
  const scaleY = metricOrDefault(metrics, "playerHitboxScaleY", HITBOX_CONFIG.playerScaleY);
  const offsetRatioX = metricOrDefault(metrics, "playerHitboxOffsetX", HITBOX_CONFIG.playerOffsetX);
  const offsetRatioY = metricOrDefault(metrics, "playerHitboxOffsetY", HITBOX_CONFIG.playerOffsetY);
  const width = player.width * scaleX;
  const height = player.height * scaleY;
  const offsetX = (player.width - width) / 2 + player.width * offsetRatioX;
  const offsetY = player.height - height + player.height * offsetRatioY;

  return {
    x: player.x + offsetX,
    y: player.y + offsetY,
    width,
    height
  };
}

export function enemyHitbox(enemy, metrics = null) {
  const scaleX = metricOrDefault(metrics, "enemyHitboxScaleX", HITBOX_CONFIG.enemyScaleX);
  const scaleY = metricOrDefault(metrics, "enemyHitboxScaleY", HITBOX_CONFIG.enemyScaleY);
  const offsetRatioX = metricOrDefault(metrics, "enemyHitboxOffsetX", HITBOX_CONFIG.enemyOffsetX);
  const offsetRatioY = metricOrDefault(metrics, "enemyHitboxOffsetY", HITBOX_CONFIG.enemyOffsetY);
  const width = enemy.width * scaleX;
  const height = enemy.height * scaleY;
  const offsetX = (enemy.width - width) / 2 + enemy.width * offsetRatioX;
  const offsetY = enemy.height - height + enemy.height * offsetRatioY;

  return {
    x: enemy.x + offsetX,
    y: enemy.y + offsetY,
    width,
    height
  };
}

export function obstacleHitbox(obstacle, metrics = null) {
  const size = Math.max(4, metricOrDefault(metrics, "obstacleHitboxShrink", HITBOX_CONFIG.obstacleShrink));
  return {
    x: obstacle.x + size / 2,
    y: obstacle.y + size / 2,
    width: Math.max(4, obstacle.width - size),
    height: Math.max(4, obstacle.height - size)
  };
}

export function collectibleIntersects(playerBox, collectible, metrics = null) {
  const centerX = collectible.x + collectible.width / 2;
  const centerY = collectible.y + collectible.height / 2;

  const nearestX = clamp(centerX, playerBox.x, playerBox.x + playerBox.width);
  const nearestY = clamp(centerY, playerBox.y, playerBox.y + playerBox.height);
  const dx = centerX - nearestX;
  const dy = centerY - nearestY;

  const radius = metricOrDefault(metrics, "collectibleRadius", HITBOX_CONFIG.collectibleRadius);
  return dx * dx + dy * dy <= radius * radius;
}

export function getCollectibleValue(type, random = Math.random) {
  if (type === "paypalCard") {
    const range = ECONOMY_CONFIG.paypalCardMax - ECONOMY_CONFIG.paypalCardMin + 1;
    return Math.floor(random() * range) + ECONOMY_CONFIG.paypalCardMin;
  }

  return ECONOMY_CONFIG.dollarValue;
}

export function nextDeceleratedSpeed(currentSpeed) {
  const next = currentSpeed * SPEED_CONFIG.decelerationRate;
  return next < SPEED_CONFIG.minSpeed ? 0 : next;
}

// Legacy helpers kept for tests and simple balancing experiments.
export function nextSpawnDelay(score) {
  const maxDelay = 1.65;
  const minDelay = 0.72;
  const reduction = score * 0.01;
  return Math.max(minDelay, maxDelay - reduction);
}

export function obstacleSpeed(score) {
  return Math.min(580, 360 + score * 2.4);
}

export function scoreStep(deltaTime, speed) {
  return deltaTime * speed * 0.05;
}
