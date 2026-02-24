import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_CONFIG,
  SPEED_CONFIG,
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
import { createPixiRenderer } from "./renderers/pixiRenderer.js";
import { createUiEffects } from "./uiEffects.js";

const canvas = document.querySelector("#game");

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
const paypalCounter = document.querySelector("#paypal-counter");
const hudCounterImage = document.querySelector("#hud-counter-image");
const ctaButton = document.querySelector("#cta-button");
const gameFooter = document.querySelector("#game-footer");
const footerCta = document.querySelector("#footer-cta");

const startBtn = document.querySelector("#start-btn");
const CTA_URL = "https://apps.apple.com/app/id6444492155";

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const GROUND_Y = GAME_HEIGHT - PLAYER_CONFIG.groundOffset;

function firstFrameOrFallback(frames, fallback) {
  if (!frames || frames.length === 0) {
    return fallback;
  }

  return frames[0];
}

const playerBaseFrame = firstFrameOrFallback(
  ASSETS.frames.playerIdle,
  firstFrameOrFallback(ASSETS.frames.playerRun, { w: 128, h: 246 })
);
const enemyBaseFrame = firstFrameOrFallback(ASSETS.frames.enemyRun, { w: 174, h: 357 });
const obstacleBaseFrame = { w: 119, h: 135 };
const obstacleBaseScale = 0.8;
const enemyCollisionScale = 0.44;
const collectibleBaseScale = 0.15;
const collectibleFallbackSourceSize = Object.freeze({
  dollar: { width: 1024, height: 1024 },
  paypalCard: { width: 800, height: 200 }
});
const collectibleBaseLift = 64;
const confettiTextureKeys = [
  "confettiParticle1",
  "confettiParticle2",
  "confettiParticle3",
  "confettiParticle4",
  "confettiParticle5",
  "confettiParticle6"
];
const CONFETTI_CONFIG = {
  PARTICLE_COUNT: 50,
  LIFETIME: 5000,
  FADE_START: 0.7,
  SCALE_MIN: 0.8,
  SCALE_MAX: 1.5,
  BURST_SPEED_MIN: 12,
  BURST_SPEED_MAX: 20,
  BURST_ANGLE_SPREAD: 30,
  SIDE_MARGIN: 50,
  SIDE_SPAWN_HEIGHT: 0.7,
  SIDE_SPAWN_SPREAD_Y: 200,
  GRAVITY: 0.05,
  AIR_RESISTANCE: 0.998,
  WIND_X: 0,
  ROTATION_SPEED_MIN: 0.02,
  ROTATION_SPEED_MAX: 0.1
};

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
  lastStepSoundAt: 0,
  musicPlayPending: false,
  winTimeoutId: null,
  nextId: 1,
  frozenEnemyAnimationTick: null,
  confettiParticles: []
};
let activeRenderer = null;

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

const uiEffects = createUiEffects({
  canvas,
  gameWidth: GAME_WIDTH,
  gameHeight: GAME_HEIGHT,
  setFooterVisible,
  getCollectibleImage(type) {
    if (type === "paypalCard") {
      return state.resources.images.paypalCardCollectible || state.resources.images.paypalCard;
    }

    return state.resources.images.collectibleIcon;
  },
  elements: {
    ctaButton,
    countdownContainer,
    countdownTime,
    endAmountLabel,
    endOverlay,
    endSubtitle,
    endTitle,
    failImage,
    failOverlay,
    lightsEffect,
    paypalCardContainer,
    paypalCardWrapper,
    paypalCounter
  }
});

function createImage(dataUri) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUri;
  });
}

function createAudio(source, volume, loop = false) {
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function waitForAudioReady(audio, timeoutMs = 1500) {
  if (!audio) {
    return Promise.resolve();
  }

  // HAVE_CURRENT_DATA (2) is enough to begin playback in most browsers.
  if (audio.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("error", onError);
      clearTimeout(timer);
      resolve();
    };
    const onReady = () => finish();
    const onError = () => finish();
    const timer = setTimeout(finish, timeoutMs);

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("loadeddata", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });

    try {
      audio.load();
    } catch {
      finish();
    }
  });
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
    imageEntries.map(async ([key, dataUri]) => [key, await createImage(dataUri)])
  );

  state.resources.images = Object.fromEntries(loaded);

  state.resources.images.paypalCard =
    state.resources.images.paypalCardOriginal ||
    state.resources.images.collectiblePaypalCard ||
    null;
  state.resources.images.paypalCardCollectible =
    state.resources.images.paypalCardOriginal ||
    state.resources.images.paypalCard ||
    state.resources.images.collectiblePaypalCard ||
    null;
  state.resources.images.lightsEffect = state.resources.images.lightsEffectOriginal || null;

  state.resources.audio = Object.fromEntries(
    Object.entries(ASSETS.audio).map(([key, value]) => [
      key,
      createAudio(value.url, value.volume, value.loop || false)
    ])
  );

  await waitForAudioReady(state.resources.audio.music);

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

function playMusic() {
  const music = state.resources.audio.music;
  if (!music) {
    return;
  }

  if (state.musicPlayPending) {
    return;
  }

  if (!music.paused && !music.ended) {
    return;
  }

  if (music.ended) {
    music.currentTime = 0;
  }

  const playAttempt = music.play();
  if (playAttempt && typeof playAttempt.then === "function") {
    state.musicPlayPending = true;
    playAttempt
      .catch(() => {
        // Browser autoplay may block audio until first interaction.
      })
      .finally(() => {
        state.musicPlayPending = false;
      });
  }
}

function stopMusic() {
  const music = state.resources.audio.music;
  if (!music) {
    return;
  }

  state.musicPlayPending = false;
  music.pause();
  music.currentTime = 0;
}

function resetWorld() {
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
    state.winTimeoutId = null;
  }
  uiEffects.clearEndTimers();

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
  state.lastStepSoundAt = 0;
  state.skyOffset = 0;
  state.groundOffset = 0;
  state.frozenEnemyAnimationTick = null;
  state.confettiParticles = [];

  resetPlayerPosition();

  state.enemies = [];
  state.obstacles = [];
  state.collectibles = [];
  state.warningLabels = [];
  state.finishLine = null;

  state.ui.score = Number.NaN;
  state.ui.hp = -1;
  stopMusic();

  hideOverlays();
  setFooterVisible(true);
  ctaButton?.classList.remove("lose");
  countdownContainer?.classList.remove("hidden");
  uiEffects.resetEndScreenAnimations();
  syncGameHeader(true);
  showIntroOverlay("Tap to start earning!");
}

function startRun(options = {}) {
  const { skipMusic = false } = options;
  if (state.mode === STATES.loading) {
    return;
  }

  hideOverlays();
  state.mode = STATES.running;
  state.isRunning = true;
  state.jumpingEnabled = false;
  if (!skipMusic) {
    playMusic();
  }
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
  state.frozenEnemyAnimationTick = null;
  state.mode = STATES.running;
  state.isRunning = true;
  state.jumpingEnabled = true;
  startJump();
}

function handleWin() {
  state.isRunning = false;
  state.mode = STATES.endWin;
  resetPlayerPosition();
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  stopMusic();
  playSound("win");
  uiEffects.showEndScreen(true, state.score);
}

function handleLose() {
  state.isRunning = false;
  state.mode = STATES.endLose;
  resetPlayerPosition();
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  stopMusic();
  playSound("lose");
  uiEffects.showEndScreen(false, state.score);
}

function triggerTutorialPause() {
  state.tutorialTriggered = true;
  state.isRunning = false;
  state.mode = STATES.paused;
  state.frozenEnemyAnimationTick = Math.floor(performance.now() / 100);
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

function imageIntrinsicSize(image, fallbackSize) {
  if (!image) {
    return fallbackSize;
  }

  const width = image.naturalWidth || image.width || fallbackSize.width;
  const height = image.naturalHeight || image.height || fallbackSize.height;
  return { width, height };
}

function collectibleRenderSize(type) {
  // Use a common pickup footprint based on the money icon, but render the
  // PayPal card as a flatter badge so it does not look stretched vertically.
  const fallbackSize = collectibleFallbackSourceSize.dollar;
  const scale = collectibleBaseScale;
  const { width: sourceWidth, height: sourceHeight } = imageIntrinsicSize(
    state.resources.images.collectibleIcon,
    fallbackSize
  );

  const baseWidth = Math.max(1, Math.round(sourceWidth * scale));
  const baseHeight = Math.max(1, Math.round(sourceHeight * scale));

  if (type === "paypalCard") {
    return {
      width: baseWidth,
      height: Math.max(1, Math.round(baseHeight * 0.5))
    };
  }

  return { width: baseWidth, height: baseHeight };
}

function spawnCollectible(yOffset = 0) {
  const type = Math.random() < 0.6 ? "dollar" : "paypalCard";
  const { width, height } = collectibleRenderSize(type);
  const baselineLift = yOffset > 0 ? 0 : collectibleBaseLift;

  const collectible = {
    id: allocateId(),
    x: GAME_WIDTH + GAME_WIDTH * 0.5,
    width,
    height,
    y: GROUND_Y - height - yOffset - baselineLift,
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
    y: GROUND_Y - 182,
    width: 240,
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
  if (state.hp <= 0) {
    handleLose();
    return;
  }

  state.player.invincibilityMs = PLAYER_CONFIG.invincibilityMs;
  state.player.blinkVisible = false;
  playSound("hit");
  playSound("hurt");
}

function collectItem(item) {
  if (item.collected) {
    return;
  }

  const from = {
    x: item.x + item.width * 0.5,
    y: item.y + item.height * 0.5
  };
  item.collected = true;
  state.score += getCollectibleValue(item.collectibleType);
  uiEffects.animateFlyingCollectible(from, item.collectibleType);
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
  triggerFinishConfetti();

  if (state.finishLine) {
    state.finishLine.tapeBroken = true;
  }
}

function confettiTextures() {
  return confettiTextureKeys
    .map((key) => state.resources.images[key])
    .filter(Boolean);
}

function spawnConfettiParticle(textures, x, y, angleRadians, spreadRadians) {
  if (textures.length === 0) {
    return;
  }

  const image = textures[Math.floor(Math.random() * textures.length)];
  const angle = angleRadians + (Math.random() - 0.5) * spreadRadians;
  const speed =
    CONFETTI_CONFIG.BURST_SPEED_MIN +
    Math.random() * (CONFETTI_CONFIG.BURST_SPEED_MAX - CONFETTI_CONFIG.BURST_SPEED_MIN);
  const rotationSpeed =
    CONFETTI_CONFIG.ROTATION_SPEED_MIN +
    Math.random() * (CONFETTI_CONFIG.ROTATION_SPEED_MAX - CONFETTI_CONFIG.ROTATION_SPEED_MIN);

  state.confettiParticles.push({
    image,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: 0,
    rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * rotationSpeed,
    scale:
      CONFETTI_CONFIG.SCALE_MIN +
      Math.random() * (CONFETTI_CONFIG.SCALE_MAX - CONFETTI_CONFIG.SCALE_MIN),
    lifetime: 0,
    maxLifetime: CONFETTI_CONFIG.LIFETIME,
    alpha: 1
  });
}

function burstConfettiSide(x, y, angleDeg, textures) {
  const angleRadians = (angleDeg * Math.PI) / 180;
  const spreadRadians = (CONFETTI_CONFIG.BURST_ANGLE_SPREAD * Math.PI) / 180;

  for (let i = 0; i < CONFETTI_CONFIG.PARTICLE_COUNT; i += 1) {
    spawnConfettiParticle(
      textures,
      x,
      y + (Math.random() - 0.5) * CONFETTI_CONFIG.SIDE_SPAWN_SPREAD_Y,
      angleRadians,
      spreadRadians
    );
  }
}

function triggerFinishConfetti() {
  const textures = confettiTextures();
  if (textures.length === 0) {
    return;
  }

  const spawnY = GAME_HEIGHT * CONFETTI_CONFIG.SIDE_SPAWN_HEIGHT;
  burstConfettiSide(CONFETTI_CONFIG.SIDE_MARGIN, spawnY, -70, textures);
  burstConfettiSide(GAME_WIDTH - CONFETTI_CONFIG.SIDE_MARGIN, spawnY, -110, textures);
}

function updateConfetti(deltaMs) {
  if (state.confettiParticles.length === 0) {
    return;
  }

  const frameStep = deltaMs / (1000 / 60);
  const airResistance = Math.pow(CONFETTI_CONFIG.AIR_RESISTANCE, frameStep);

  for (let i = state.confettiParticles.length - 1; i >= 0; i -= 1) {
    const particle = state.confettiParticles[i];
    particle.lifetime += deltaMs;

    if (particle.lifetime >= particle.maxLifetime) {
      state.confettiParticles.splice(i, 1);
      continue;
    }

    particle.vy += CONFETTI_CONFIG.GRAVITY * frameStep;
    particle.vx += CONFETTI_CONFIG.WIND_X * frameStep;
    particle.vx *= airResistance;
    particle.vy *= airResistance;
    particle.x += particle.vx * frameStep;
    particle.y += particle.vy * frameStep;
    particle.rotation += particle.rotationSpeed * frameStep;

    const progress = particle.lifetime / particle.maxLifetime;
    if (progress > CONFETTI_CONFIG.FADE_START) {
      const fadeProgress =
        (progress - CONFETTI_CONFIG.FADE_START) / (1 - CONFETTI_CONFIG.FADE_START);
      particle.alpha = Math.max(0, 1 - fadeProgress);
    } else {
      particle.alpha = 1;
    }
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

  const now = performance.now();
  if (
    state.currentSpeed > 200 &&
    !state.player.isJumping &&
    now - state.lastStepSoundAt >= 220
  ) {
    playSound("step");
    state.lastStepSoundAt = now;
  }

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

function createRenderer() {
  return createPixiRenderer({
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    groundY: GROUND_Y
  });
}

function ensureRenderer() {
  if (!activeRenderer) {
    activeRenderer = createRenderer();
  }

  return activeRenderer;
}

function render(elapsedSeconds) {
  syncGameHeader();
  ensureRenderer().render({
    elapsedSeconds,
    state
  });
}

function update(deltaSeconds, deltaMs) {
  updateConfetti(deltaMs);

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

  // Music exists in extracted assets, but the first autoplay attempt can be
  // blocked or fail on some browsers. Retry on subsequent user gestures.
  if (state.mode === STATES.running || state.mode === STATES.paused) {
    playMusic();
  }

  if (state.mode === STATES.intro) {
    playMusic();
    startRun({ skipMusic: true });
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

function handleMusicActivationFallback() {
  if (
    state.mode === STATES.intro ||
    state.mode === STATES.running ||
    state.mode === STATES.paused
  ) {
    playMusic();
  }
}

startBtn.addEventListener("click", () => {
  if (state.mode === STATES.intro) {
    playMusic();
    startRun({ skipMusic: true });
  }
});

ctaButton?.addEventListener("click", () => {
  window.open(CTA_URL, "_blank", "noopener,noreferrer");
});

footerCta?.addEventListener("click", () => {
  window.open(CTA_URL, "_blank", "noopener,noreferrer");
});

canvas.addEventListener("pointerdown", handlePrimaryInput, { passive: false });
canvas.addEventListener("click", handleMusicActivationFallback, { passive: true });
window.addEventListener("keydown", handlePrimaryInput, { passive: false });

async function boot() {
  startBtn.disabled = true;
  startCopy.textContent = "Loading extracted assets...";

  try {
    await ensureRenderer().init?.();
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
  activeRenderer?.destroy?.();
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
  }
  uiEffects.clearEndTimers();
});
