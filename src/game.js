import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_CONFIG,
  SPEED_CONFIG,
  HITBOX_CONFIG,
  ECONOMY_CONFIG,
  SPAWN_SEQUENCE,
  STATES,
  computeJumpY,
  playerHitbox,
  enemyHitbox,
  obstacleHitbox,
  collectibleIntersects,
  getCollectibleValue,
  intersects,
  nextDeceleratedSpeed,
  shouldSpawn,
  spawnDistanceToPx
} from "./gameLogic.js";
import { ASSETS } from "./assets/extractedAssets.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const startOverlay = document.querySelector("#start-overlay");
const endOverlay = document.querySelector("#end-overlay");
const startCopy = document.querySelector("#start-copy");
const introHand = document.querySelector("#intro-hand");
const endTitle = document.querySelector("#end-title");
const endSubtitle = document.querySelector("#end-subtitle");
const countdownContainer = document.querySelector("#countdown-container");
const countdownTime = document.querySelector("#countdown-time");
const failImage = document.querySelector("#fail-image");
const failOverlay = document.querySelector("#fail-overlay");
const paypalCardWrapper = document.querySelector("#paypal-card-wrapper");
const paypalCardContainer = document.querySelector(".paypal-card-container");
const paypalCardImage = document.querySelector("#paypal-card-image");
const lightsEffect = document.querySelector("#lights-effect");
const endAmountLabel = document.querySelector("#end-amount");
const hpDisplay = document.querySelector("#hp-display");
const scoreDisplay = document.querySelector("#score-display");
const hudCounterImage = document.querySelector("#hud-counter-image");
const ctaButton = document.querySelector("#cta-button");
const gameFooter = document.querySelector("#game-footer");
const footerCta = document.querySelector("#footer-cta");

const startBtn = document.querySelector("#start-btn");
const CTA_URL = "https://apps.apple.com/app/id6444492155";

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const GROUND_Y = GAME_HEIGHT - PLAYER_CONFIG.groundOffset;

const LOCAL_MEDIA_OVERRIDES = Object.freeze({
  failBanner: "./download.png",
  tutorialHand: "./download3.png",
  hudCounter: "./download4.webp",
  backdropPortrait: "./download.webp",
  backdropLandscape: "./download.webp",
  paypalCard: "./download1.webp",
  lightsEffect: "./download2.png"
});

function firstFrameOrFallback(frames, fallback) {
  if (!frames || frames.length === 0) {
    return fallback;
  }

  return frames[0];
}

function frameSourceBox(frame) {
  return {
    sourceX: frame.sourceX ?? 0,
    sourceY: frame.sourceY ?? 0,
    sourceW: frame.sourceW ?? frame.w,
    sourceH: frame.sourceH ?? frame.h
  };
}

const playerBaseFrame = firstFrameOrFallback(
  ASSETS.frames.playerIdle,
  firstFrameOrFallback(ASSETS.frames.playerRun, { w: 128, h: 246 })
);
const enemyBaseFrame = firstFrameOrFallback(ASSETS.frames.enemyRun, { w: 174, h: 357 });
const obstacleBaseFrame = { w: 119, h: 135 };
const obstacleBaseScale = 0.8;
const playerRenderHeightMultiplier = 1.58;
const enemyCollisionScale = 0.44;
const enemyRenderScaleMultiplier = 1.12;

const state = {
  mode: STATES.loading,
  score: ECONOMY_CONFIG.startBalance,
  bestScore: 0,
  hp: ECONOMY_CONFIG.maxHp,
  isRunning: false,
  jumpingEnabled: false,
  tutorialTriggered: false,
  tutorialEnemyId: null,
  spawnIndex: 0,
  distanceTraveled: 0,
  currentSpeed: SPEED_CONFIG.base,
  isDecelerating: false,
  finishLineSpawned: false,
  skyOffset: 0,
  groundOffset: 0,
  player: {
    x: Math.round(GAME_WIDTH * PLAYER_CONFIG.xPosition),
    width: Math.round(playerBaseFrame.w * PLAYER_CONFIG.scale),
    height: Math.round(playerBaseFrame.h * PLAYER_CONFIG.scale),
    y: 0,
    jumpStartY: 0,
    jumpProgress: 0,
    isJumping: false,
    invincibilityMs: 0,
    blinkAccumulatorMs: 0,
    blinkVisible: true,
    animationTime: 0
  },
  enemies: [],
  obstacles: [],
  collectibles: [],
  warningLabels: [],
  finishLine: null,
  resources: {
    images: {},
    audio: {}
  },
  ui: {
    score: Number.NaN,
    hp: -1
  },
  rafId: 0,
  lastFrameTime: 0,
  winTimeoutId: null,
  countdownIntervalId: null,
  balanceAnimationId: null,
  failTimeoutId: null,
  introBlinkNextMs: 0,
  introBlinkUntilMs: 0,
  nextId: 1
};

function allocateId() {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}

function resetPlayerPosition() {
  state.player.y = GROUND_Y - state.player.height;
  state.player.jumpStartY = state.player.y;
  state.player.jumpProgress = 0;
  state.player.isJumping = false;
  state.player.invincibilityMs = 0;
  state.player.blinkAccumulatorMs = 0;
  state.player.blinkVisible = true;
  state.player.animationTime = 0;
}

function hideOverlays() {
  startOverlay.classList.remove("overlay-visible");
  endOverlay.classList.remove("overlay-visible");
  failOverlay?.classList.add("hidden");
}

function setFooterVisible(visible) {
  gameFooter?.classList.toggle("hidden", !visible);
}

function showIntroOverlay(message = "Tap to start earning!") {
  startCopy.textContent = message;
  startOverlay.classList.add("overlay-visible");
}

function clearEndTimers() {
  if (state.countdownIntervalId) {
    clearInterval(state.countdownIntervalId);
    state.countdownIntervalId = null;
  }

  if (state.balanceAnimationId) {
    cancelAnimationFrame(state.balanceAnimationId);
    state.balanceAnimationId = null;
  }

  if (state.failTimeoutId) {
    clearTimeout(state.failTimeoutId);
    state.failTimeoutId = null;
  }
}

function updateCountdownDisplay(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (countdownTime) {
    countdownTime.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
}

function startCountdown(durationSeconds = 60) {
  if (!countdownContainer) {
    return;
  }

  if (state.countdownIntervalId) {
    clearInterval(state.countdownIntervalId);
    state.countdownIntervalId = null;
  }
  let remaining = durationSeconds;
  countdownContainer.classList.remove("hidden");
  updateCountdownDisplay(remaining);

  state.countdownIntervalId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      countdownContainer.classList.add("hidden");
      if (state.countdownIntervalId) {
        clearInterval(state.countdownIntervalId);
        state.countdownIntervalId = null;
      }
      return;
    }

    updateCountdownDisplay(remaining);
  }, 1000);
}

function resetEndScreenAnimations() {
  if (state.balanceAnimationId) {
    cancelAnimationFrame(state.balanceAnimationId);
    state.balanceAnimationId = null;
  }

  if (endAmountLabel) {
    endAmountLabel.textContent = "$0.00";
  }

  paypalCardWrapper?.classList.remove("hidden");
  paypalCardContainer?.classList.remove("animate-scale");
  lightsEffect?.classList.remove("animate-lights");
  void paypalCardContainer?.offsetHeight;
}

function animateBalance(targetValue) {
  const start = performance.now();
  const durationMs = 1000;

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = 1 - (1 - progress) ** 3;
    const value = targetValue * eased;

    if (endAmountLabel) {
      endAmountLabel.textContent = `$${value.toFixed(2)}`;
    }

    if (progress < 1) {
      state.balanceAnimationId = requestAnimationFrame(tick);
    } else {
      state.balanceAnimationId = null;
    }
  };

  state.balanceAnimationId = requestAnimationFrame(tick);
}

function playEndScreenAnimations(totalReward) {
  resetEndScreenAnimations();
  paypalCardContainer?.classList.add("animate-scale");
  lightsEffect?.classList.add("animate-lights");
  setTimeout(() => {
    animateBalance(totalReward);
  }, 600);
}

function showFailAnimation(totalReward) {
  if (!failOverlay) {
    endOverlay.classList.add("overlay-visible");
    playEndScreenAnimations(totalReward);
    startCountdown(60);
    return;
  }

  failOverlay.classList.remove("hidden");

  if (failImage) {
    failImage.style.animation = "none";
    void failImage.offsetHeight;
    failImage.style.animation = "";
  }

  state.failTimeoutId = setTimeout(() => {
    failOverlay.classList.add("hidden");
    endOverlay.classList.add("overlay-visible");
    playEndScreenAnimations(totalReward);
    startCountdown(60);
    state.failTimeoutId = null;
  }, 1500);
}

function showEndScreen(isWin, totalReward) {
  clearEndTimers();
  setFooterVisible(false);

  if (endTitle) {
    endTitle.textContent = isWin ? "Congratulations!" : "You didn't make it!";
  }
  if (endSubtitle) {
    endSubtitle.textContent = isWin ? "Choose your reward!" : "Try again on the app!";
  }
  if (ctaButton) {
    ctaButton.classList.toggle("lose", !isWin);
  }
  if (countdownContainer && !isWin) {
    countdownContainer.classList.add("hidden");
  }

  if (isWin) {
    endOverlay.classList.add("overlay-visible");
    playEndScreenAnimations(totalReward);
    startCountdown(60);
  } else {
    showFailAnimation(totalReward);
  }
}

function createImage(dataUri) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUri;
  });
}

function createAudio(source, volume) {
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

async function loadImageWithFallback(overrideUrl, fallbackDataUri) {
  if (overrideUrl) {
    try {
      return await createImage(overrideUrl);
    } catch {
      // fall through to built-in data-uri
    }
  }

  return createImage(fallbackDataUri);
}

async function loadOptionalImage(url) {
  try {
    return await createImage(url);
  } catch {
    return null;
  }
}

function syncGameHeader(force = false) {
  const roundedScore = Math.floor(state.score);

  if ((force || state.ui.score !== roundedScore) && scoreDisplay) {
    scoreDisplay.textContent = `$${roundedScore}`;
    state.ui.score = roundedScore;
  }

  if ((force || state.ui.hp !== state.hp) && hpDisplay) {
    hpDisplay.textContent = "";

    for (let i = 0; i < ECONOMY_CONFIG.maxHp; i += 1) {
      const heart = document.createElement("span");
      heart.className = `heart ${i < state.hp ? "filled" : "empty"}`;
      heart.textContent = "❤️";
      hpDisplay.appendChild(heart);
    }

    state.ui.hp = state.hp;
  }
}

async function loadResources() {
  const imageEntries = Object.entries(ASSETS.images);
  const loaded = await Promise.all(
    imageEntries.map(async ([key, dataUri]) => [
      key,
      await loadImageWithFallback(LOCAL_MEDIA_OVERRIDES[key], dataUri)
    ])
  );

  state.resources.images = Object.fromEntries(loaded);
  state.resources.images.paypalCard =
    (await loadOptionalImage(LOCAL_MEDIA_OVERRIDES.paypalCard)) || null;
  state.resources.images.lightsEffect =
    (await loadOptionalImage(LOCAL_MEDIA_OVERRIDES.lightsEffect)) || null;

  state.resources.audio = Object.fromEntries(
    Object.entries(ASSETS.audio).map(([key, value]) => [key, createAudio(value.url, value.volume)])
  );

  failImage.src = state.resources.images.failBanner.src;

  if (hudCounterImage) {
    hudCounterImage.src = state.resources.images.hudCounter?.src || "";
  }
  if (paypalCardImage) {
    paypalCardImage.src = state.resources.images.paypalCard?.src || "";
  }
  if (lightsEffect) {
    lightsEffect.src = state.resources.images.lightsEffect?.src || "";
  }
  if (introHand) {
    introHand.src = state.resources.images.tutorialHand?.src || "";
  }
  if (gameFooter) {
    const portrait = state.resources.images.backdropPortrait?.src || "";
    const landscape = state.resources.images.backdropLandscape?.src || portrait;
    gameFooter.style.setProperty("--footer-portrait", `url(${portrait})`);
    gameFooter.style.setProperty("--footer-landscape", `url(${landscape})`);
  }
}

function playSound(key) {
  const sound = state.resources.audio[key];
  if (!sound) {
    return;
  }

  sound.currentTime = 0;
  sound.play().catch(() => {
    // Browser autoplay may block audio until first interaction.
  });
}

function resetWorld() {
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
    state.winTimeoutId = null;
  }
  clearEndTimers();

  state.mode = STATES.intro;
  state.score = ECONOMY_CONFIG.startBalance;
  state.hp = ECONOMY_CONFIG.maxHp;
  state.isRunning = false;
  state.jumpingEnabled = false;
  state.tutorialTriggered = false;
  state.tutorialEnemyId = null;
  state.spawnIndex = 0;
  state.distanceTraveled = 0;
  state.currentSpeed = SPEED_CONFIG.base;
  state.isDecelerating = false;
  state.finishLineSpawned = false;
  state.skyOffset = 0;
  state.groundOffset = 0;

  resetPlayerPosition();

  state.enemies = [];
  state.obstacles = [];
  state.collectibles = [];
  state.warningLabels = [];
  state.finishLine = null;

  state.ui.score = Number.NaN;
  state.ui.hp = -1;
  state.introBlinkUntilMs = 0;
  state.introBlinkNextMs = performance.now() + 900;

  hideOverlays();
  setFooterVisible(true);
  ctaButton?.classList.remove("lose");
  countdownContainer?.classList.remove("hidden");
  resetEndScreenAnimations();
  syncGameHeader(true);
  showIntroOverlay("Tap to start earning!");
}

function startRun() {
  if (state.mode === STATES.loading) {
    return;
  }

  hideOverlays();
  state.mode = STATES.running;
  state.isRunning = true;
  state.jumpingEnabled = false;
}

function startJump() {
  if (state.player.isJumping) {
    return;
  }

  state.player.isJumping = true;
  state.player.jumpStartY = state.player.y;
  state.player.jumpProgress = 0;
  playSound("jump");
}

function resumeFromTutorial() {
  state.mode = STATES.running;
  state.isRunning = true;
  state.jumpingEnabled = true;
  startJump();
}

function handleWin() {
  state.isRunning = false;
  state.mode = STATES.endWin;
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  showEndScreen(true, state.score);
}

function handleLose() {
  state.isRunning = false;
  state.mode = STATES.endLose;
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  playSound("hit");
  showEndScreen(false, state.score);
}

function triggerTutorialPause() {
  state.tutorialTriggered = true;
  state.isRunning = false;
  state.mode = STATES.paused;
}

function spawnWarningLabel(x) {
  state.warningLabels.push({
    id: allocateId(),
    x,
    y: GROUND_Y - 200,
    pulseSeed: Math.random() * Math.PI * 2
  });
}

function spawnEnemy() {
  const scale = enemyCollisionScale;

  const enemy = {
    id: allocateId(),
    x: GAME_WIDTH + GAME_WIDTH * 0.5,
    y: 0,
    width: Math.round(enemyBaseFrame.w * scale),
    height: Math.round(enemyBaseFrame.h * scale),
    animationOffset: Math.floor(Math.random() * ASSETS.frames.enemyRun.length),
    scale,
    speed: SPEED_CONFIG.base,
    isTutorialEnemy: false
  };

  enemy.y = GROUND_Y - enemy.height;
  state.enemies.push(enemy);
  return enemy;
}

function spawnObstacle() {
  const width = Math.round(obstacleBaseFrame.w * obstacleBaseScale);
  const height = Math.round(obstacleBaseFrame.h * obstacleBaseScale);

  const obstacle = {
    id: allocateId(),
    x: GAME_WIDTH + GAME_WIDTH * 0.5,
    width,
    height,
    y: GROUND_Y - height,
    pulseSeed: Math.random() * Math.PI * 2,
    speed: SPEED_CONFIG.base
  };

  state.obstacles.push(obstacle);
}

function spawnCollectible(yOffset = 0) {
  const type = Math.random() < 0.6 ? "dollar" : "paypalCard";
  const width = type === "paypalCard" ? 86 : 54;
  const height = type === "paypalCard" ? 58 : 54;

  const collectible = {
    id: allocateId(),
    x: GAME_WIDTH + GAME_WIDTH * 0.5,
    width,
    height,
    y: GROUND_Y - height - yOffset,
    speed: SPEED_CONFIG.base,
    collected: false,
    collectibleType: type,
    bobSeed: Math.random() * Math.PI * 2
  };

  state.collectibles.push(collectible);
}

function spawnFinishLine() {
  state.finishLine = {
    id: allocateId(),
    x: GAME_WIDTH + GAME_WIDTH * 0.5,
    y: GROUND_Y - 180,
    width: 180,
    height: 210,
    speed: SPEED_CONFIG.base,
    tapeBroken: false,
    tapeBreakX: 0
  };

  state.finishLine.tapeBreakX = state.finishLine.x - 300;
  state.finishLineSpawned = true;
}

function spawnEntity(entry) {
  if (entry.type === "enemy") {
    const enemy = spawnEnemy();
    if (entry.pauseForTutorial && !state.tutorialTriggered) {
      enemy.isTutorialEnemy = true;
      state.tutorialEnemyId = enemy.id;
    }
    return;
  }

  if (entry.type === "obstacle") {
    spawnObstacle();
    if (entry.warningLabel) {
      spawnWarningLabel(GAME_WIDTH + GAME_WIDTH * 0.5);
    }
    return;
  }

  if (entry.type === "collectible") {
    spawnCollectible(entry.yOffset || 0);
    return;
  }

  if (entry.type === "finish") {
    spawnFinishLine();
  }
}

function checkSpawns() {
  while (state.spawnIndex < SPAWN_SEQUENCE.length) {
    const entry = SPAWN_SEQUENCE[state.spawnIndex];
    const spawnDistance = spawnDistanceToPx(entry.distance);

    if (!shouldSpawn(spawnDistance, state.distanceTraveled)) {
      break;
    }

    spawnEntity(entry);
    state.spawnIndex += 1;
  }
}

function updatePlayer(deltaSeconds, deltaMs) {
  state.player.animationTime += deltaSeconds;

  if (state.player.isJumping) {
    state.player.jumpProgress += deltaMs / PLAYER_CONFIG.jumpDurationMs;

    if (state.player.jumpProgress >= 1) {
      state.player.isJumping = false;
      state.player.jumpProgress = 0;
      state.player.y = GROUND_Y - state.player.height;
    } else {
      state.player.y = computeJumpY(state.player.jumpStartY, state.player.jumpProgress);
    }
  }

  if (state.player.invincibilityMs > 0) {
    state.player.invincibilityMs -= deltaMs;
    state.player.blinkAccumulatorMs += deltaMs;

    if (state.player.blinkAccumulatorMs >= 100) {
      state.player.blinkAccumulatorMs = 0;
      state.player.blinkVisible = !state.player.blinkVisible;
    }

    if (state.player.invincibilityMs <= 0) {
      state.player.invincibilityMs = 0;
      state.player.blinkVisible = true;
      state.player.blinkAccumulatorMs = 0;
    }
  }

  if (state.mode === STATES.intro) {
    const now = performance.now();
    if (now >= state.introBlinkNextMs) {
      state.introBlinkUntilMs = now + 140;
      state.introBlinkNextMs = now + 2100 + Math.random() * 1700;
    }
  }
}

function updateEntities(deltaSeconds) {
  for (const enemy of state.enemies) {
    enemy.speed = state.currentSpeed;
    enemy.x -= (enemy.speed + SPEED_CONFIG.enemyChaseBoost) * deltaSeconds;
  }

  for (const obstacle of state.obstacles) {
    obstacle.speed = state.currentSpeed;
    obstacle.x -= obstacle.speed * deltaSeconds;
  }

  for (const collectible of state.collectibles) {
    collectible.speed = state.currentSpeed;
    collectible.x -= collectible.speed * deltaSeconds;
  }

  for (const warning of state.warningLabels) {
    warning.x -= state.currentSpeed * deltaSeconds;
  }

  if (state.finishLine) {
    state.finishLine.speed = state.currentSpeed;
    state.finishLine.x -= state.finishLine.speed * deltaSeconds;
    state.finishLine.tapeBreakX = state.finishLine.x - 300;
  }
}

function checkTutorialTrigger() {
  if (!state.tutorialEnemyId || state.tutorialTriggered) {
    return;
  }

  const enemy = state.enemies.find((item) => item.id === state.tutorialEnemyId);
  if (!enemy) {
    state.tutorialEnemyId = null;
    return;
  }

  if (enemy.x - state.player.x <= SPEED_CONFIG.tutorialPauseDistance) {
    triggerTutorialPause();
  }
}

function hitPlayer() {
  if (state.player.invincibilityMs > 0) {
    return;
  }

  state.hp -= 1;
  state.player.invincibilityMs = PLAYER_CONFIG.invincibilityMs;
  state.player.blinkVisible = false;
  playSound("hit");

  if (state.hp <= 0) {
    handleLose();
  }
}

function collectItem(item) {
  if (item.collected) {
    return;
  }

  item.collected = true;
  state.score += getCollectibleValue(item.collectibleType);
  playSound("collect");
}

function checkCollisions() {
  const playerBox = playerHitbox(state.player);

  for (const enemy of state.enemies) {
    if (state.player.invincibilityMs > 0) {
      break;
    }

    if (intersects(playerBox, enemyHitbox(enemy))) {
      hitPlayer();
      break;
    }
  }

  for (const obstacle of state.obstacles) {
    if (state.player.invincibilityMs > 0) {
      break;
    }

    if (intersects(playerBox, obstacleHitbox(obstacle))) {
      hitPlayer();
      break;
    }
  }

  for (const collectible of state.collectibles) {
    if (collectible.collected) {
      continue;
    }

    if (collectibleIntersects(playerBox, collectible)) {
      collectItem(collectible);
    }
  }
}

function startDeceleration() {
  if (state.isDecelerating) {
    return;
  }

  state.isDecelerating = true;

  if (state.finishLine) {
    state.finishLine.tapeBroken = true;
  }
}

function cleanupEntities() {
  state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -120);
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -120);
  state.collectibles = state.collectibles.filter(
    (collectible) => !collectible.collected && collectible.x + collectible.width > -120
  );
  state.warningLabels = state.warningLabels.filter((warning) => warning.x > -260);

  if (state.finishLine && state.finishLine.x + state.finishLine.width < -180) {
    state.finishLine = null;
  }
}

function updateRunning(deltaSeconds, deltaMs) {
  if (state.isDecelerating) {
    const nextSpeed = nextDeceleratedSpeed(state.currentSpeed);
    state.currentSpeed = nextSpeed;

    if (nextSpeed === 0 && !state.winTimeoutId) {
      state.isDecelerating = false;
      state.winTimeoutId = setTimeout(() => {
        state.winTimeoutId = null;
        handleWin();
      }, 500);
    }
  }

  const scene = state.resources.images.sceneBackground;
  if (scene) {
    const sceneScale = GROUND_Y / scene.height;
    const sceneDrawWidth = scene.width * sceneScale;
    const sceneCycle = Math.max(1, sceneDrawWidth * 2);

    state.skyOffset += state.currentSpeed * deltaSeconds;
    if (state.skyOffset > 10_000_000) {
      state.skyOffset %= sceneCycle;
    }
  } else {
    state.skyOffset = (state.skyOffset + state.currentSpeed * 0.08 * deltaSeconds) % GAME_WIDTH;
  }
  state.groundOffset = (state.groundOffset + state.currentSpeed * deltaSeconds) % 120;
  state.distanceTraveled += state.currentSpeed * deltaSeconds;

  checkSpawns();
  updateEntities(deltaSeconds);
  checkTutorialTrigger();

  if (state.finishLine && !state.isDecelerating && state.player.x >= state.finishLine.tapeBreakX) {
    startDeceleration();
  }

  checkCollisions();
  cleanupEntities();
  updatePlayer(deltaSeconds, deltaMs);
}

function currentPlayerFrame() {
  const idleFrames = ASSETS.frames.playerIdle || ASSETS.frames.playerRun;
  const runFrames = ASSETS.frames.playerRun;
  const jumpFrames = ASSETS.frames.playerJump;
  const hurtFrames = ASSETS.frames.playerHurt;

  if (state.mode === STATES.endLose || state.player.invincibilityMs > 0) {
    return hurtFrames[Math.floor(state.player.animationTime * 10) % hurtFrames.length];
  }

  if (state.player.isJumping) {
    return jumpFrames[Math.floor(state.player.animationTime * 12) % jumpFrames.length];
  }

  if (state.mode === STATES.running || state.mode === STATES.paused) {
    return runFrames[Math.floor(state.player.animationTime * 12) % runFrames.length];
  }

  if (state.mode === STATES.intro) {
    return idleFrames[0];
  }

  return runFrames[0];
}

function drawSky() {
  const scene = state.resources.images.sceneBackground;
  if (scene) {
    const scale = GROUND_Y / scene.height;
    const drawWidth = scene.width * scale;

    const tileIndexStart = Math.floor(state.skyOffset / drawWidth);
    const wrappedOffset = ((state.skyOffset % drawWidth) + drawWidth) % drawWidth;
    const tileStartX = -wrappedOffset;
    const tileCount = Math.ceil(GAME_WIDTH / drawWidth) + 2;

    for (let i = 0; i < tileCount; i += 1) {
      const tileIndex = tileIndexStart + i;
      const tileX = tileStartX + i * drawWidth;
      const mirrored = tileIndex % 2 !== 0;

      if (mirrored) {
        ctx.save();
        ctx.translate(tileX + drawWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(scene, 0, 0, drawWidth, GROUND_Y);
        ctx.restore();
      } else {
        ctx.drawImage(scene, tileX, 0, drawWidth, GROUND_Y);
      }
    }

    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, "#b9e7ff");
  gradient.addColorStop(1, "#7ec3f2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
}

function drawSceneDecor() {
  if (!state.resources.images.sceneBackground) {
    return;
  }

  const treeLeft = state.resources.images.sceneTreeLeft;
  const treeRight = state.resources.images.sceneTreeRight;
  const bushLarge = state.resources.images.sceneBushLarge;
  const bushSmall = state.resources.images.sceneBushSmall;
  const lamp = state.resources.images.sceneLamp;

  const scene = state.resources.images.sceneBackground;
  const sceneScale = GROUND_Y / scene.height;
  const sceneDrawWidth = scene.width * sceneScale;
  const tileIndexStart = Math.floor(state.skyOffset / sceneDrawWidth);
  const wrappedOffset = ((state.skyOffset % sceneDrawWidth) + sceneDrawWidth) % sceneDrawWidth;
  const tileStartX = -wrappedOffset;
  const tileCount = Math.ceil(GAME_WIDTH / sceneDrawWidth) + 2;

  function drawDecor(image, localX, localY, width, height, tileX, mirrored) {
    if (!image) {
      return;
    }

    if (!mirrored) {
      ctx.drawImage(image, tileX + localX, localY, width, height);
      return;
    }

    const mirroredX = tileX + (sceneDrawWidth - localX - width);
    ctx.save();
    ctx.translate(mirroredX + width, localY);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }

  for (let i = 0; i < tileCount; i += 1) {
    const tileIndex = tileIndexStart + i;
    const tileX = tileStartX + i * sceneDrawWidth;
    const mirrored = tileIndex % 2 !== 0;

    drawDecor(treeLeft, -120, -40, 430, 340, tileX, mirrored);
    drawDecor(treeRight, GAME_WIDTH - 255, -40, 335, 340, tileX, mirrored);
    drawDecor(lamp, GAME_WIDTH * 0.495, 140, 62, 250, tileX, mirrored);
    drawDecor(bushSmall, -30, GROUND_Y - 110, 165, 165, tileX, mirrored);
    drawDecor(bushLarge, GAME_WIDTH - 250, GROUND_Y - 125, 220, 180, tileX, mirrored);
  }
}

function drawGround() {
  if (state.resources.images.sceneBackground) {
    return;
  }

  ctx.fillStyle = "#1f2f3e";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  ctx.fillStyle = "#283f52";
  for (let i = -1; i < GAME_WIDTH / 56 + 2; i += 1) {
    const x = i * 56 - (state.groundOffset % 56);
    ctx.fillRect(x, GROUND_Y + 42, 34, 11);
  }
}

function drawPlayer() {
  if (!state.player.blinkVisible) {
    return;
  }

  const spriteSheet = state.resources.images.playerSheet;
  const frame = currentPlayerFrame();

  if (!spriteSheet || !frame) {
    ctx.fillStyle = "#f2664b";
    ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
    return;
  }

  const box = frameSourceBox(frame);
  const targetHeight = state.player.height * playerRenderHeightMultiplier;
  const drawScale = targetHeight / box.sourceH;
  const fullWidth = box.sourceW * drawScale;
  const fullHeight = box.sourceH * drawScale;
  const fullX = state.player.x + (state.player.width - fullWidth) * 0.5;
  const fullY = state.player.y + (state.player.height - fullHeight);
  const drawX = fullX + box.sourceX * drawScale;
  const drawY = fullY + box.sourceY * drawScale;
  const drawWidth = frame.w * drawScale;
  const drawHeight = frame.h * drawScale;

  ctx.drawImage(
    spriteSheet,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  if (state.mode === STATES.intro && performance.now() <= state.introBlinkUntilMs) {
    const eyeY = drawY + drawHeight * 0.35;
    const leftEyeX = drawX + drawWidth * 0.47;
    const rightEyeX = drawX + drawWidth * 0.59;
    const eyeW = drawWidth * 0.055;

    ctx.strokeStyle = "#2b180f";
    ctx.lineWidth = Math.max(2, drawWidth * 0.012);
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(leftEyeX - eyeW * 0.45, eyeY);
    ctx.lineTo(leftEyeX + eyeW * 0.45, eyeY + eyeW * 0.08);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightEyeX - eyeW * 0.45, eyeY);
    ctx.lineTo(rightEyeX + eyeW * 0.45, eyeY + eyeW * 0.08);
    ctx.stroke();
  }
}

function drawEnemies(elapsedSeconds) {
  const spriteSheet = state.resources.images.enemySheet;
  const sequence = ASSETS.frames.enemyRun;

  for (const enemy of state.enemies) {
    if (!spriteSheet) {
      ctx.fillStyle = "#263947";
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      continue;
    }

    const frame = sequence[(Math.floor(elapsedSeconds * 10) + enemy.animationOffset) % sequence.length];
    const box = frameSourceBox(frame);
    const drawScale = (enemy.scale || enemyCollisionScale) * enemyRenderScaleMultiplier;
    const fullWidth = box.sourceW * drawScale;
    const fullHeight = box.sourceH * drawScale;
    const fullX = enemy.x + (enemy.width - fullWidth) * 0.5;
    const fullY = enemy.y + (enemy.height - fullHeight);
    const mirroredSourceX = box.sourceW - box.sourceX - frame.w;
    const drawX = fullX + mirroredSourceX * drawScale;
    const drawY = fullY + box.sourceY * drawScale;
    const drawWidth = frame.w * drawScale;
    const drawHeight = frame.h * drawScale;

    // Enemy atlas frames face opposite run direction, so mirror source placement.
    ctx.drawImage(spriteSheet, frame.x, frame.y, frame.w, frame.h, drawX, drawY, drawWidth, drawHeight);
  }
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawObstacles(elapsedSeconds) {
  const obstacleSprite = state.resources.images.obstacleSprite;
  const obstacleGlow = state.resources.images.obstacleGlow;

  for (const obstacle of state.obstacles) {
    if (obstacleGlow) {
      const pulse = 1 + Math.sin(elapsedSeconds * 3 + obstacle.pulseSeed) * 0.1;
      const glowWidth = obstacle.width * pulse;
      const glowHeight = obstacle.height * pulse;
      const glowX = obstacle.x - (glowWidth - obstacle.width) * 0.5;
      const glowY = obstacle.y - (glowHeight - obstacle.height);

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(obstacleGlow, glowX, glowY, glowWidth, glowHeight);
      ctx.restore();
    }

    if (obstacleSprite) {
      ctx.drawImage(obstacleSprite, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      continue;
    }

    // Fallback shape if extracted obstacle sprite is unavailable.
    const pulse = 1 + Math.sin(elapsedSeconds * 4 + obstacle.pulseSeed) * 0.05;
    const width = obstacle.width * pulse;
    const height = obstacle.height * pulse;
    const x = obstacle.x - (width - obstacle.width) * 0.5;
    const y = obstacle.y - (height - obstacle.height);

    ctx.fillStyle = "rgba(255, 200, 64, 0.32)";
    roundedRect(x, y, width, height, 14);
    ctx.fill();
  }
}

function drawCollectibles(elapsedSeconds) {
  const icon = state.resources.images.collectibleIcon;
  const paypalCard = state.resources.images.paypalCard;

  for (const collectible of state.collectibles) {
    const bob = Math.sin(elapsedSeconds * 4 + collectible.bobSeed) * 10;
    const y = collectible.y + bob;

    if (collectible.collectibleType === "paypalCard") {
      if (paypalCard) {
        ctx.drawImage(paypalCard, collectible.x, y, collectible.width, collectible.height);
        continue;
      }

      ctx.fillStyle = "#1756c6";
      roundedRect(collectible.x, y, collectible.width, collectible.height * 0.68, 10);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 26px GameFont";
      ctx.fillText("P", collectible.x + collectible.width * 0.38, y + collectible.height * 0.46);
      continue;
    }

    if (icon) {
      ctx.drawImage(icon, collectible.x, y, collectible.width, collectible.height);
      continue;
    }

    ctx.fillStyle = "#ffe170";
    ctx.beginPath();
    ctx.arc(
      collectible.x + collectible.width * 0.5,
      y + collectible.height * 0.5,
      collectible.width * 0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawFinishLine() {
  const finish = state.finishLine;
  if (!finish) {
    return;
  }

  const leftPoleX = finish.x - 50;
  const rightPoleX = finish.x + 62;
  const poleTopY = finish.y;

  ctx.fillStyle = "#ffffff";
  roundedRect(leftPoleX, poleTopY - 10, 16, 190, 6);
  ctx.fill();
  roundedRect(rightPoleX, poleTopY + 10, 16, 170, 6);
  ctx.fill();

  if (!finish.tapeBroken) {
    ctx.strokeStyle = "#ebf6ff";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(leftPoleX + 8, poleTopY + 38);
    ctx.lineTo(rightPoleX + 8, poleTopY + 58);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#ebf6ff";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(leftPoleX + 8, poleTopY + 40);
    ctx.lineTo(leftPoleX - 32, poleTopY + 88);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightPoleX + 8, poleTopY + 58);
    ctx.lineTo(rightPoleX + 44, poleTopY + 94);
    ctx.stroke();
  }
}

function drawWarnings(elapsedSeconds) {
  for (const warning of state.warningLabels) {
    const pulse = 1 + Math.sin(elapsedSeconds * 8 + warning.pulseSeed) * 0.1;
    const w = 166 * pulse;
    const h = 52 * pulse;
    const x = warning.x - w * 0.5;
    const y = warning.y - h * 0.5;

    ctx.fillStyle = "rgba(255, 191, 0, 0.94)";
    roundedRect(x, y, w, h, 10);
    ctx.fill();

    ctx.strokeStyle = "#ea7b0a";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ff1f16";
    ctx.font = "900 30px GameFont";
    ctx.textAlign = "center";
    ctx.fillText("AVOID!", warning.x, warning.y + 11);
    ctx.textAlign = "start";
  }
}

function drawTutorialHint() {
  if (state.mode !== STATES.paused) {
    return;
  }

  ctx.fillStyle = "rgba(8, 20, 34, 0.72)";
  roundedRect(GAME_WIDTH * 0.5 - 220, 148, 440, 82, 20);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px GameFont";
  ctx.textAlign = "center";
  ctx.fillText("Jump to avoid enemies", GAME_WIDTH * 0.5, 203);
  ctx.textAlign = "start";

  const hand = state.resources.images.tutorialHand;
  if (hand) {
    ctx.drawImage(hand, GAME_WIDTH * 0.5 - 50, GROUND_Y - 230, 100, 100);
  }
}

function drawIntroHint() {
  if (state.mode !== STATES.intro) {
    return;
  }

  const hand = state.resources.images.tutorialHand;
  if (hand) {
    ctx.drawImage(hand, GAME_WIDTH * 0.5 - 52, GROUND_Y - 230, 104, 104);
  }
}

function render(elapsedSeconds) {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  syncGameHeader();

  drawSky();
  drawSceneDecor();
  drawGround();
  drawCollectibles(elapsedSeconds);
  drawObstacles(elapsedSeconds);
  drawFinishLine();
  drawEnemies(elapsedSeconds);
  drawWarnings(elapsedSeconds);
  drawPlayer();
  drawTutorialHint();
}

function update(deltaSeconds, deltaMs) {
  if (state.mode === STATES.running && state.isRunning) {
    updateRunning(deltaSeconds, deltaMs);
    return;
  }

  updatePlayer(deltaSeconds, deltaMs);
}

function gameLoop(timestamp) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaMs = Math.min(33, timestamp - state.lastFrameTime);
  const deltaSeconds = deltaMs / 1000;
  state.lastFrameTime = timestamp;

  update(deltaSeconds, deltaMs);
  render(timestamp / 1000);

  state.rafId = requestAnimationFrame(gameLoop);
}

function handlePrimaryInput(event) {
  if (event.type === "keydown" && event.code !== "Space") {
    return;
  }

  event.preventDefault();

  if (state.mode === STATES.intro) {
    startRun();
    return;
  }

  if (state.mode === STATES.paused) {
    resumeFromTutorial();
    return;
  }

  if (state.mode === STATES.running) {
    const onGround = !state.player.isJumping;
    if (state.jumpingEnabled && onGround && !state.finishLineSpawned) {
      startJump();
    }
    return;
  }

  if (state.mode === STATES.endLose || state.mode === STATES.endWin) {
    resetWorld();
    startRun();
  }
}

startBtn.addEventListener("click", () => {
  if (state.mode === STATES.intro) {
    startRun();
  }
});

ctaButton?.addEventListener("click", () => {
  window.open(CTA_URL, "_blank", "noopener,noreferrer");
});

footerCta?.addEventListener("click", () => {
  window.open(CTA_URL, "_blank", "noopener,noreferrer");
});

canvas.addEventListener("pointerdown", handlePrimaryInput, { passive: false });
window.addEventListener("keydown", handlePrimaryInput, { passive: false });

async function boot() {
  startBtn.disabled = true;
  startCopy.textContent = "Loading extracted assets...";

  try {
    await loadResources();
    resetWorld();
  } catch {
    showIntroOverlay("Assets failed to load. Reload and try again.");
  } finally {
    startBtn.disabled = false;
    render(0);
    state.rafId = requestAnimationFrame(gameLoop);
  }
}

boot();

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(state.rafId);
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
  }
  clearEndTimers();
});
