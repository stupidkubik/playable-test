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
  playerScaleY: 0.78,
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
  tapeBreakAnimationMs: 2680
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
  leftPoleScale: 1.65,
  rightPoleScale: 1.35,
  leftPoleBottomXOffset: -350,
  rightPoleBottomXOffset: -240,
  leftPoleBottomYOffset: -50,
  rightPoleBottomYOffset: 22,
  poleRotation: -Math.PI / 2,
  tapeScaleY: 1,
  leftTapeAnchorXOffsetFromPoleTop: -10,
  leftTapeAnchorYOffsetFromPoleTop: 30,
  rightTapeAnchorXOffsetFromPoleBottom: -5,
  rightTapeAnchorYOffsetFromPoleTop: 30,
  tapeJoinYOffset: -12,
  tapeJoinOverlapPx: 6,
  leftTapeBreakEndXOffset: 0,
  rightTapeBreakEndXOffset: 0,
  leftTapeBreakEndYOffset: 120,
  rightTapeBreakEndYOffset: 120,
  leftTapeBreakArcX: -28,
  rightTapeBreakArcX: 28,
  leftTapeBreakArcY: 48,
  rightTapeBreakArcY: 48
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

function easeInOutSine(t) {
  const clamped = clamp(t, 0, 1);
  return -(Math.cos(Math.PI * clamped) - 1) / 2;
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

function distanceBetweenPoints(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function quadraticBezierPoint(start, control, end, t) {
  const clamped = clamp(t, 0, 1);
  const inv = 1 - clamped;
  return {
    x: inv * inv * start.x + 2 * inv * clamped * control.x + clamped * clamped * end.x,
    y: inv * inv * start.y + 2 * inv * clamped * control.y + clamped * clamped * end.y
  };
}

function extendPointAwayFrom(point, awayFrom, distance) {
  const dx = point.x - awayFrom.x;
  const dy = point.y - awayFrom.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6 || distance === 0) {
    return point;
  }

  return {
    x: point.x + (dx / length) * distance,
    y: point.y + (dy / length) * distance
  };
}

function offsetPointByPathNormal(startPoint, endPoint, basePoint, distance) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6 || distance === 0) {
    return basePoint;
  }

  return {
    x: basePoint.x + (-dy / length) * distance,
    y: basePoint.y + (dx / length) * distance
  };
}

export function computeFinishTapeVisualState(finishGeometry, tapeBreakProgress = 0) {
  if (!finishGeometry?.tape?.left?.anchor || !finishGeometry?.tape?.right?.anchor) {
    return null;
  }

  const progress = clamp(tapeBreakProgress, 0, 1);
  const joinOverlapPx = Math.max(0, 1 - progress * 6) * FINISH_LAYOUT.tapeJoinOverlapPx;
  const leftRenderFreeBase = extendPointAwayFrom(
    finishGeometry.tape.left.free,
    finishGeometry.tape.left.anchor,
    joinOverlapPx
  );
  const rightRenderFreeBase = extendPointAwayFrom(
    finishGeometry.tape.right.free,
    finishGeometry.tape.right.anchor,
    joinOverlapPx
  );
  const waveEnvelope = Math.pow(Math.sin(Math.PI * progress), 1.1);
  const waveAmplitude = waveEnvelope * 20;
  const waveCycles = 2.2;
  const wavePhase = progress * Math.PI * 2 * 2;
  const endpointWave = Math.sin(Math.PI * waveCycles - wavePhase) * waveAmplitude;
  const leftRenderFree = offsetPointByPathNormal(
    finishGeometry.tape.left.anchor,
    leftRenderFreeBase,
    leftRenderFreeBase,
    endpointWave
  );
  const rightRenderFree = offsetPointByPathNormal(
    rightRenderFreeBase,
    finishGeometry.tape.right.anchor,
    rightRenderFreeBase,
    endpointWave
  );

  return {
    joinOverlapPx,
    waveAmplitude,
    waveCycles,
    wavePhase,
    leftRenderFree,
    rightRenderFree,
    breakLineX: (leftRenderFree.x + rightRenderFree.x) * 0.5,
    breakLineY: (leftRenderFree.y + rightRenderFree.y) * 0.5
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
  const leftTapeHeight = finishImageDimension(images, "finishTapeLeft", "height") * FINISH_LAYOUT.tapeScaleY;
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
  const leftTapeAnchorBaseX = leftPoleBottomX + FINISH_LAYOUT.leftTapeAnchorXOffsetFromPoleTop;
  const leftTapeAnchorBaseY = leftPoleBounds.minY + FINISH_LAYOUT.leftTapeAnchorYOffsetFromPoleTop;
  const rightTapeAnchorBaseX = rightPoleBottomX + FINISH_LAYOUT.rightTapeAnchorXOffsetFromPoleBottom;
  const rightTapeAnchorBaseY = rightPoleBounds.minY + FINISH_LAYOUT.rightTapeAnchorYOffsetFromPoleTop;
  const leftTapeAnchor = { x: leftTapeAnchorBaseX, y: leftTapeAnchorBaseY };
  const rightTapeAnchor = { x: rightTapeAnchorBaseX, y: rightTapeAnchorBaseY };
  const tapeJoinPoint = {
    x: (leftTapeAnchor.x + rightTapeAnchor.x) * 0.5,
    y: (leftTapeAnchor.y + rightTapeAnchor.y) * 0.5 + FINISH_LAYOUT.tapeJoinYOffset
  };
  const leftTapeEndPoint = {
    x: leftTapeAnchor.x + FINISH_LAYOUT.leftTapeBreakEndXOffset,
    y: leftTapeAnchor.y + FINISH_LAYOUT.leftTapeBreakEndYOffset
  };
  const rightTapeEndPoint = {
    x: rightTapeAnchor.x + FINISH_LAYOUT.rightTapeBreakEndXOffset,
    y: rightTapeAnchor.y + FINISH_LAYOUT.rightTapeBreakEndYOffset
  };
  const leftTapeControlPoint = {
    x: (tapeJoinPoint.x + leftTapeEndPoint.x) * 0.5 + FINISH_LAYOUT.leftTapeBreakArcX,
    y: (tapeJoinPoint.y + leftTapeEndPoint.y) * 0.5 + FINISH_LAYOUT.leftTapeBreakArcY
  };
  const rightTapeControlPoint = {
    x: (tapeJoinPoint.x + rightTapeEndPoint.x) * 0.5 + FINISH_LAYOUT.rightTapeBreakArcX,
    y: (tapeJoinPoint.y + rightTapeEndPoint.y) * 0.5 + FINISH_LAYOUT.rightTapeBreakArcY
  };
  const pointAnimationProgress = easeInOutSine(tapeBreakProgress);
  const leftTapeFreePoint = quadraticBezierPoint(
    tapeJoinPoint,
    leftTapeControlPoint,
    leftTapeEndPoint,
    pointAnimationProgress
  );
  const rightTapeFreePoint = quadraticBezierPoint(
    tapeJoinPoint,
    rightTapeControlPoint,
    rightTapeEndPoint,
    pointAnimationProgress
  );
  const leftTapeIntactLength = distanceBetweenPoints(leftTapeAnchor, leftTapeFreePoint);
  const rightTapeIntactLength = distanceBetweenPoints(rightTapeAnchor, rightTapeFreePoint);
  const leftTapeRotation = Math.atan2(
    leftTapeFreePoint.y - leftTapeAnchor.y,
    leftTapeFreePoint.x - leftTapeAnchor.x
  );
  const rightTapeRotation = Math.atan2(
    rightTapeAnchor.y - rightTapeFreePoint.y,
    rightTapeAnchor.x - rightTapeFreePoint.x
  );
  const tapeBreakLineX = (leftTapeFreePoint.x + rightTapeFreePoint.x) * 0.5;
  const tapeBreakLineY = (leftTapeFreePoint.y + rightTapeFreePoint.y) * 0.5;

  const leftTapeSprite = createSpriteGeometry({
    x: leftTapeAnchor.x,
    y: leftTapeAnchor.y,
    width: leftTapeIntactLength,
    height: leftTapeHeight,
    rotation: leftTapeRotation,
    anchorX: 0,
    anchorY: 0
  });
  const rightTapeSprite = createSpriteGeometry({
    x: rightTapeAnchor.x,
    y: rightTapeAnchor.y,
    width: rightTapeIntactLength,
    height: rightTapeHeight,
    rotation: rightTapeRotation,
    anchorX: 1,
    anchorY: 0
  });

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
      joinPoint: tapeJoinPoint,
      left: {
        anchor: leftTapeAnchor,
        free: leftTapeFreePoint
      },
      right: {
        anchor: rightTapeAnchor,
        free: rightTapeFreePoint
      }
    },
    bounds
  };
}

export function spawnDistanceToPx(distance, metrics = null) {
  const spawnWidth = metricOrDefault(
    metrics,
    "spawnDistancePxPerUnit",
    metricOrDefault(metrics, "worldWidth", GAME_WIDTH)
  );
  return distance * spawnWidth;
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

function writeHitbox(target, x, y, width, height) {
  if (target) {
    target.x = x;
    target.y = y;
    target.width = width;
    target.height = height;
    return target;
  }

  return { x, y, width, height };
}

export function playerHitbox(player, metrics = null, out = null) {
  const scaleX = metricOrDefault(metrics, "playerHitboxScaleX", HITBOX_CONFIG.playerScaleX);
  const scaleY = metricOrDefault(metrics, "playerHitboxScaleY", HITBOX_CONFIG.playerScaleY);
  const offsetRatioX = metricOrDefault(metrics, "playerHitboxOffsetX", HITBOX_CONFIG.playerOffsetX);
  const offsetRatioY = metricOrDefault(metrics, "playerHitboxOffsetY", HITBOX_CONFIG.playerOffsetY);
  const width = player.width * scaleX;
  const height = player.height * scaleY;
  const offsetX = (player.width - width) / 2 + player.width * offsetRatioX;
  const offsetY = player.height - height + player.height * offsetRatioY;

  return writeHitbox(out, player.x + offsetX, player.y + offsetY, width, height);
}

export function enemyHitbox(enemy, metrics = null, out = null) {
  const scaleX = metricOrDefault(metrics, "enemyHitboxScaleX", HITBOX_CONFIG.enemyScaleX);
  const scaleY = metricOrDefault(metrics, "enemyHitboxScaleY", HITBOX_CONFIG.enemyScaleY);
  const offsetRatioX = metricOrDefault(metrics, "enemyHitboxOffsetX", HITBOX_CONFIG.enemyOffsetX);
  const offsetRatioY = metricOrDefault(metrics, "enemyHitboxOffsetY", HITBOX_CONFIG.enemyOffsetY);
  const width = enemy.width * scaleX;
  const height = enemy.height * scaleY;
  const offsetX = (enemy.width - width) / 2 + enemy.width * offsetRatioX;
  const offsetY = enemy.height - height + enemy.height * offsetRatioY;

  return writeHitbox(out, enemy.x + offsetX, enemy.y + offsetY, width, height);
}

export function obstacleHitbox(obstacle, metrics = null, out = null) {
  const size = Math.max(4, metricOrDefault(metrics, "obstacleHitboxShrink", HITBOX_CONFIG.obstacleShrink));
  return writeHitbox(
    out,
    obstacle.x + size / 2,
    obstacle.y + size / 2,
    Math.max(4, obstacle.width - size),
    Math.max(4, obstacle.height - size)
  );
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
