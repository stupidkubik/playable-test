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
