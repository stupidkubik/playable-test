import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_CONFIG,
  SPEED_CONFIG,
  ECONOMY_CONFIG,
  FINISH_CONFIG,
  SPAWN_SEQUENCE,
  STATES,
  computeJumpY,
  computeFinishGateGeometry,
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
import { ASSET_FRAMES } from "./assets/frames.js";
import { createPixiRenderer } from "./renderers/pixiRenderer.js";
import { createUiEffects } from "./uiEffects.js";
import { createViewportManager } from "./viewport.js";

const appShell = document.querySelector(".app-shell");
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

function registerServiceWorker() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  const protocol = window.location?.protocol || "";
  const hostname = window.location?.hostname || "";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const isSecureContext = protocol === "https:" || isLocalHost;

  if (!isSecureContext) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => console.warn("[sw] registration failed", error));
  });
}

registerServiceWorker();

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const GROUND_Y = GAME_HEIGHT - PLAYER_CONFIG.groundOffset;
const viewportManager = createViewportManager({
  root: appShell || canvas?.parentElement || document.body,
  worldWidth: GAME_WIDTH,
  worldHeight: GAME_HEIGHT
});

function firstFrameOrFallback(frames, fallback) {
  if (!frames || frames.length === 0) {
    return fallback;
  }

  return frames[0];
}

const playerBaseFrame = firstFrameOrFallback(
  ASSET_FRAMES.playerIdle,
  firstFrameOrFallback(ASSET_FRAMES.playerRun, { w: 128, h: 246 })
);
const enemyBaseFrame = firstFrameOrFallback(ASSET_FRAMES.enemyRun, { w: 174, h: 357 });
const obstacleBaseFrame = { w: 119, h: 135 };
const obstacleBaseScale = 0.8;
const enemyCollisionScale = 0.616;
const collectibleBaseScale = 0.15;
const collectibleFallbackSourceSize = Object.freeze({
  dollar: { width: 1024, height: 1024 },
  paypalCard: { width: 800, height: 200 }
});
const collectibleBaseLift = 64;
const collectibleAerialOffsetBoost = 70;
const confettiTextureKeys = [
  "confettiParticle1",
  "confettiParticle2",
  "confettiParticle3",
  "confettiParticle4",
  "confettiParticle5",
  "confettiParticle6"
];
const CONFETTI_CONFIG = {
  PARTICLE_COUNT: 66,
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
  SECONDARY_BURST_DELAY_MS: 500,
  SECONDARY_BURST_REPEAT_COUNT: 3,
  SECONDARY_BURST_COUNT_SCALE: 0.72,
  SECONDARY_BURST_SPREAD_SCALE: 1.18,
  GRAVITY: 0.05,
  AIR_RESISTANCE: 0.998,
  WIND_X: 0,
  ROTATION_SPEED_MIN: 0.02,
  ROTATION_SPEED_MAX: 0.1
};
const COMBO_POPUP_CONFIG = {
  durationMs: 850,
  risePx: 120,
  fadeInMs: 90,
  fadeOutMs: 220,
  baseScale: 1,
  popScale: 1.2
};
const SPAWN_RUNTIME_CONFIG = {
  maxSpawnsPerFrame: 3,
  resizeCooldownMs: 220
};
const COMBO_PRAISE_RULES = [
  { streak: 6, text: "Perfect!", color: 0xffd54a, outline: 0x442000, fontSize: 58 },
  { streak: 10, text: "Awesome!", color: 0x79f1ff, outline: 0x103a52, fontSize: 60 },
  { streak: 14, text: "Fantastic!", color: 0xff8bf3, outline: 0x4b1548, fontSize: 62 }
];

const IMAGE_DEFERRED_KEYS = Object.freeze([
  "failBanner",
  "tutorialHand",
  "paypalCardOriginal",
  "lightsEffectOriginal",
  "backdropPortrait",
  "backdropLandscape",
  "finishFloorPattern",
  "finishPoleLeft",
  "finishPoleRight",
  "finishTapeLeft",
  "finishTapeRight",
  "confettiParticle1",
  "confettiParticle2",
  "confettiParticle3",
  "confettiParticle4",
  "confettiParticle5",
  "confettiParticle6"
]);
const IMAGE_DEFERRED_KEY_SET = new Set(IMAGE_DEFERRED_KEYS);
const AUDIO_MUSIC_KEYS = Object.freeze(["music"]);
const AUDIO_SFX_KEYS = Object.freeze(["jump", "hit", "collect", "hurt", "step", "lose", "win"]);

function hasBundledAssetConstants() {
  return (
    typeof ASSET_IMAGES !== "undefined" &&
    typeof ASSET_AUDIO !== "undefined" &&
    typeof ASSET_FRAMES !== "undefined"
  );
}

function pickAssetKeys(source, keys) {
  const picked = Object.create(null);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key];
    }
  }
  return picked;
}

function omitAssetKeys(source, excludedKeys) {
  const result = Object.create(null);
  for (const [key, value] of Object.entries(source || {})) {
    if (!excludedKeys.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

async function loadCriticalImageAssetsData() {
  if (hasBundledAssetConstants()) {
    return omitAssetKeys(ASSET_IMAGES, IMAGE_DEFERRED_KEY_SET);
  }

  const module = await import("./assets/imagesCritical.js");
  return module.ASSET_IMAGES_CRITICAL || {};
}

async function loadDeferredImageAssetsData() {
  if (hasBundledAssetConstants()) {
    return pickAssetKeys(ASSET_IMAGES, IMAGE_DEFERRED_KEYS);
  }

  const module = await import("./assets/imagesDeferred.js");
  return module.ASSET_IMAGES_DEFERRED || {};
}

async function loadMusicAudioAssetsData() {
  if (hasBundledAssetConstants()) {
    return pickAssetKeys(ASSET_AUDIO, AUDIO_MUSIC_KEYS);
  }

  const module = await import("./assets/audioMusic.js");
  return module.ASSET_AUDIO_MUSIC || {};
}

async function loadSfxAudioAssetsData() {
  if (hasBundledAssetConstants()) {
    return pickAssetKeys(ASSET_AUDIO, AUDIO_SFX_KEYS);
  }

  const module = await import("./assets/audioSfx.js");
  return module.ASSET_AUDIO_SFX || {};
}

function readPerfDebugConfig() {
  const search = globalThis.location?.search || "";
  const params = new URLSearchParams(search);
  const normalizedQuery = (params.get("debugPerf") || "").trim().toLowerCase();
  const queryEnabled = ["1", "true", "yes", "on"].includes(normalizedQuery);
  const globalEnabled = globalThis.__PLAYABLE_DEBUG_PERF__ === true;
  let storageEnabled = false;

  try {
    const storageValue = globalThis.localStorage?.getItem("playable:debugPerf");
    storageEnabled = storageValue === "1" || storageValue === "true";
  } catch {
    storageEnabled = false;
  }

  const enabled = queryEnabled || storageEnabled || globalEnabled;
  const parsePositiveNumber = (name, fallback) => {
    const raw = params.get(name);
    const value = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    enabled,
    slowFrameMs: parsePositiveNumber("debugPerfFrameMs", 34),
    slowSpawnMs: parsePositiveNumber("debugPerfSpawnMs", 4),
    minLogGapMs: parsePositiveNumber("debugPerfGapMs", 180)
  };
}

function createPerfDebugLogger() {
  const config = readPerfDebugConfig();
  let currentFrame = null;
  let lastSlowFrameLogAt = 0;
  let suppressedSlowFrames = 0;

  if (config.enabled) {
    console.info(
      "[perf] debug logging enabled",
      {
        slowFrameMs: config.slowFrameMs,
        slowSpawnMs: config.slowSpawnMs,
        minLogGapMs: config.minLogGapMs
      }
    );
  }

  function beginFrame(timestamp, deltaMs) {
    if (!config.enabled) {
      currentFrame = null;
      return null;
    }

    currentFrame = {
      timestamp,
      deltaMs,
      updateMs: 0,
      renderMs: 0,
      checkSpawnsMs: 0,
      spawnedTypes: [],
      counts: null
    };
    return currentFrame;
  }

  function addSpawn(type) {
    if (!currentFrame) {
      return;
    }

    currentFrame.spawnedTypes.push(type);
  }

  function setCheckSpawnsMs(ms) {
    if (!currentFrame || !Number.isFinite(ms)) {
      return;
    }

    currentFrame.checkSpawnsMs = ms;
  }

  function setUpdateMs(ms) {
    if (!currentFrame || !Number.isFinite(ms)) {
      return;
    }

    currentFrame.updateMs = ms;
  }

  function setRenderMs(ms) {
    if (!currentFrame || !Number.isFinite(ms)) {
      return;
    }

    currentFrame.renderMs = ms;
  }

  function setCounts(counts) {
    if (!currentFrame) {
      return;
    }

    currentFrame.counts = counts;
  }

  function maybeLogSpawnHotspot() {
    if (!currentFrame) {
      return;
    }

    if (currentFrame.checkSpawnsMs < config.slowSpawnMs) {
      return;
    }

    console.warn("[perf] slow checkSpawns()", {
      checkSpawnsMs: Number(currentFrame.checkSpawnsMs.toFixed(2)),
      spawnedTypes: currentFrame.spawnedTypes,
      counts: currentFrame.counts,
      mode: state.mode,
      distanceTraveled: Math.round(state.distanceTraveled)
    });
  }

  function endFrame() {
    if (!currentFrame) {
      return;
    }

    maybeLogSpawnHotspot();

    const workMs = currentFrame.updateMs + currentFrame.renderMs;
    if (workMs >= config.slowFrameMs) {
      const now = performance.now();
      if (now - lastSlowFrameLogAt < config.minLogGapMs) {
        suppressedSlowFrames += 1;
      } else {
        const summary = {
          workMs: Number(workMs.toFixed(2)),
          updateMs: Number(currentFrame.updateMs.toFixed(2)),
          renderMs: Number(currentFrame.renderMs.toFixed(2)),
          checkSpawnsMs: Number(currentFrame.checkSpawnsMs.toFixed(2)),
          deltaMs: Number(currentFrame.deltaMs.toFixed(2)),
          mode: state.mode,
          decelerating: state.isDecelerating,
          spawnedTypes: currentFrame.spawnedTypes,
          counts: currentFrame.counts
        };
        if (suppressedSlowFrames > 0) {
          summary.suppressedSlowFrames = suppressedSlowFrames;
          suppressedSlowFrames = 0;
        }
        console.warn("[perf] slow frame", summary);
        lastSlowFrameLogAt = now;
      }
    }

    currentFrame = null;
  }

  return {
    enabled: config.enabled,
    beginFrame,
    addSpawn,
    setCheckSpawnsMs,
    setUpdateMs,
    setRenderMs,
    setCounts,
    endFrame
  };
}

const perfDebugLogger = createPerfDebugLogger();

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
  spawnUnitWidth: GAME_WIDTH,
  spawnResumeAtMs: 0,
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
  comboPopups: [],
  collectComboStreak: 0,
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
  confettiBurstTimeoutId: null,
  nextId: 1,
  frozenEnemyAnimationTick: null,
  confettiParticles: [],
  objectUrlPool: [],
  dataUriObjectUrlCache: new Map(),
  audioWarmup: {
    musicReady: false,
    musicReadyPromise: null,
    sfxReadyPromise: null
  },
  deferredAssetsPromise: null,
  musicPlayRetryRequested: false
};
let activeRenderer = null;

viewportManager.subscribe(
  (viewportState) => {
    activeRenderer?.resize?.(viewportState.layoutState || viewportState);
    syncPlayerBaseXForLayoutChange(viewportState.layoutState || null);
    syncSpawnMetricsForLayoutChange(viewportState.layoutState || null);
  },
  { immediate: false }
);

function allocateId() {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}

function currentLayoutState() {
  return viewportManager.getState().layoutState || null;
}

function currentLogicMetrics() {
  const layoutState = currentLayoutState();
  const gameplayTokens = layoutState?.gameplayTokens;
  return {
    worldWidth: gameplayTokens?.runtimeWorldW ?? GAME_WIDTH,
    worldHeight: gameplayTokens?.runtimeWorldH ?? GAME_HEIGHT,
    cameraViewWorldWidth: gameplayTokens?.runtimeWorldW ?? GAME_WIDTH,
    cameraViewWorldHeight: gameplayTokens?.runtimeWorldH ?? GAME_HEIGHT,
    spawnDistancePxPerUnit:
      gameplayTokens?.spawnDistancePxPerUnit ?? gameplayTokens?.runtimeWorldW ?? GAME_WIDTH,
    spawnLeadViewportWidth: gameplayTokens?.spawnLeadViewportWidth ?? gameplayTokens?.runtimeWorldW ?? GAME_WIDTH,
    spawnAheadFromPlayer: gameplayTokens?.spawnAheadFromPlayer ?? null,
    cleanupBehindPlayer: gameplayTokens?.cleanupBehindPlayer ?? null,
    cleanupMarginX: gameplayTokens?.cleanupMarginX ?? 120,
    jumpHeight: PLAYER_CONFIG.jumpHeight
  };
}

function syncPlayerBaseXForLayoutChange(layoutState) {
  const fallbackX = Math.round(GAME_WIDTH * PLAYER_CONFIG.xPosition);
  const nextPlayerBaseX = Number.isFinite(layoutState?.gameplayTokens?.playerBaseX)
    ? layoutState.gameplayTokens.playerBaseX
    : fallbackX;

  if (!Number.isFinite(nextPlayerBaseX)) {
    return;
  }

  if (!Number.isFinite(state.player?.x) || Math.abs(state.player.x - nextPlayerBaseX) >= 0.5) {
    state.player.x = nextPlayerBaseX;
  }
}

function currentSpawnUnitWidth() {
  const logicMetrics = currentLogicMetrics();
  return logicMetrics.spawnDistancePxPerUnit ?? logicMetrics.worldWidth ?? GAME_WIDTH;
}

function rescaleDistanceTraveledForSpawnUnit(nextSpawnUnitWidth) {
  if (!Number.isFinite(nextSpawnUnitWidth) || nextSpawnUnitWidth <= 0) {
    return;
  }

  const previousSpawnUnitWidth =
    Number.isFinite(state.spawnUnitWidth) && state.spawnUnitWidth > 0
      ? state.spawnUnitWidth
      : nextSpawnUnitWidth;

  if (Math.abs(previousSpawnUnitWidth - nextSpawnUnitWidth) >= 0.5) {
    const traveledUnits = state.distanceTraveled / previousSpawnUnitWidth;
    state.distanceTraveled = traveledUnits * nextSpawnUnitWidth;
    if (state.mode === STATES.running && state.isRunning) {
      state.spawnResumeAtMs = performance.now() + SPAWN_RUNTIME_CONFIG.resizeCooldownMs;
    }
  }

  state.spawnUnitWidth = nextSpawnUnitWidth;
}

function syncSpawnMetricsForLayoutChange(layoutState) {
  const gameplayTokens = layoutState?.gameplayTokens;
  const nextSpawnUnitWidth =
    gameplayTokens?.spawnDistancePxPerUnit ?? gameplayTokens?.runtimeWorldW ?? GAME_WIDTH;
  rescaleDistanceTraveledForSpawnUnit(nextSpawnUnitWidth);
}

function currentSpawnWorldX() {
  const logicMetrics = currentLogicMetrics();
  const explicitAhead = logicMetrics.spawnAheadFromPlayer;
  if (Number.isFinite(explicitAhead)) {
    return state.player.x + explicitAhead;
  }

  const spawnLeadWidth = logicMetrics.spawnLeadViewportWidth ?? logicMetrics.worldWidth;
  return spawnLeadWidth + spawnLeadWidth * 0.5;
}

function currentCleanupMinX() {
  const logicMetrics = currentLogicMetrics();
  const explicitBehind = logicMetrics.cleanupBehindPlayer;
  if (Number.isFinite(explicitBehind)) {
    return state.player.x - explicitBehind;
  }

  return -(logicMetrics.cleanupMarginX ?? 120);
}

function currentGroundY() {
  const layoutState = currentLayoutState();
  return layoutState?.gameplayTokens?.runtimeGroundY ?? GROUND_Y;
}

function currentPlayerBaseX() {
  const layoutState = currentLayoutState();
  return layoutState?.gameplayTokens?.playerBaseX ?? Math.round(GAME_WIDTH * PLAYER_CONFIG.xPosition);
}

function currentFinishGateGeometry(finishLine = state.finishLine) {
  if (!finishLine) {
    return null;
  }

  return computeFinishGateGeometry(finishLine, currentGroundY(), state.resources.images);
}

function resetPlayerPosition() {
  state.player.x = currentPlayerBaseX();
  state.player.y = currentGroundY() - state.player.height;
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
  projectWorldToScreen(x, y) {
    return viewportManager.projectWorldToScreen(x, y);
  },
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

function createImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function dataUriToObjectUrl(dataUri) {
  if (typeof dataUri !== "string" || !dataUri.startsWith("data:")) {
    return null;
  }

  const cached = state.dataUriObjectUrlCache.get(dataUri);
  if (cached) {
    return cached;
  }

  const commaIndex = dataUri.indexOf(",");
  if (commaIndex < 0) {
    return null;
  }

  const meta = dataUri.slice(5, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  const mime = meta.split(";")[0] || "application/octet-stream";
  const isBase64 = /;base64/i.test(meta);

  let bytes = null;
  if (isBase64) {
    const binary = atob(payload);
    const length = binary.length;
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      array[i] = binary.charCodeAt(i);
    }
    bytes = array;
  } else {
    const text = decodeURIComponent(payload);
    bytes = new TextEncoder().encode(text);
  }

  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  state.dataUriObjectUrlCache.set(dataUri, objectUrl);
  state.objectUrlPool.push(objectUrl);
  return objectUrl;
}

function normalizeAssetSource(source) {
  if (typeof source !== "string") {
    return source;
  }

  if (!source.startsWith("data:")) {
    return source;
  }

  // Local file:// mode can be unstable with very long data-URIs in some browsers.
  // Blob URLs are more reliable and are also reused from cache.
  const maybeObjectUrl = dataUriToObjectUrl(source);
  return maybeObjectUrl || source;
}

async function createImage(source) {
  const normalizedSource = normalizeAssetSource(source);

  try {
    return await createImageFromSource(normalizedSource);
  } catch (firstError) {
    if (typeof normalizedSource === "string" && normalizedSource.startsWith("data:")) {
      try {
        const response = await fetch(normalizedSource);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const image = await createImageFromSource(objectUrl);
        state.objectUrlPool.push(objectUrl);
        return image;
      } catch {
        throw firstError;
      }
    }

    throw firstError;
  }
}

function createAudio(source, volume, loop = false) {
  const normalizedSource = normalizeAssetSource(source);
  const audio = new Audio(normalizedSource);
  audio.preload = "auto";
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function createAudioMap(assetMap) {
  return Object.fromEntries(
    Object.entries(assetMap || {}).map(([key, value]) => [
      key,
      createAudio(value.url, value.volume, value.loop || false)
    ])
  );
}

async function loadImageElements(assetMap) {
  const entries = Object.entries(assetMap || {});
  if (entries.length === 0) {
    return {};
  }

  const settled = await Promise.all(
    entries.map(async ([key, source]) => {
      try {
        return {
          ok: true,
          key,
          image: await createImage(source)
        };
      } catch (error) {
        return {
          ok: false,
          key,
          error
        };
      }
    })
  );
  const loaded = [];
  const failed = [];

  for (const item of settled) {
    if (item.ok) {
      loaded.push([item.key, item.image]);
      continue;
    }

    failed.push(item);
  }

  if (failed.length > 0) {
    console.warn("[assets] failed image loads", {
      failedCount: failed.length,
      loadedCount: loaded.length,
      keys: failed.map((item) => item.key)
    });
  }

  if (loaded.length === 0) {
    throw new Error("No image assets were loaded.");
  }

  return Object.fromEntries(loaded);
}

function normalizeImageAliases() {
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
}

function applyLoadedImageBindings() {
  if (failImage) {
    failImage.src = state.resources.images.failBanner?.src || "";
  }

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
  const musicAudioDataPromise = loadMusicAudioAssetsData();
  const criticalImagesDataPromise = loadCriticalImageAssetsData();

  state.audioWarmup.musicReady = false;
  state.audioWarmup.musicReadyPromise = musicAudioDataPromise
    .then(async (musicAudioData) => {
      Object.assign(state.resources.audio, createAudioMap(musicAudioData));
      const music = state.resources.audio.music;
      state.audioWarmup.musicReady = Boolean(music && music.readyState >= 2);
      if (music) {
        await waitForAudioReady(music);
        state.audioWarmup.musicReady = true;
        if (state.musicPlayRetryRequested) {
          state.musicPlayRetryRequested = false;
          playMusic();
        }
      }
    })
    .catch((error) => {
      console.warn("[assets] music preload failed", error);
    });

  const criticalImages = await loadImageElements(await criticalImagesDataPromise);
  Object.assign(state.resources.images, criticalImages);
  normalizeImageAliases();
  applyLoadedImageBindings();

  if (!state.deferredAssetsPromise) {
    state.deferredAssetsPromise = warmDeferredAssets().catch((error) => {
      console.warn("[assets] deferred preload failed", error);
    });
  }
}

async function warmDeferredAssets() {
  const [deferredImageData, sfxAudioData] = await Promise.all([
    loadDeferredImageAssetsData(),
    loadSfxAudioAssetsData()
  ]);

  if (Object.keys(sfxAudioData).length > 0) {
    Object.assign(state.resources.audio, createAudioMap(sfxAudioData));
  }
  state.audioWarmup.sfxReadyPromise = Promise.resolve();

  const deferredImages = await loadImageElements(deferredImageData);
  if (Object.keys(deferredImages).length > 0) {
    Object.assign(state.resources.images, deferredImages);
    normalizeImageAliases();
    applyLoadedImageBindings();
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
    state.musicPlayRetryRequested = true;
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
  state.musicPlayRetryRequested = false;
  const music = state.resources.audio.music;
  if (!music) {
    return;
  }

  state.musicPlayPending = false;
  music.pause();
  music.currentTime = 0;
}

function clearScheduledConfettiBurst() {
  if (!state.confettiBurstTimeoutId) {
    return;
  }

  clearTimeout(state.confettiBurstTimeoutId);
  state.confettiBurstTimeoutId = null;
}

function comboPraiseForStreak(streak) {
  return COMBO_PRAISE_RULES.find((rule) => streak === rule.streak) || null;
}

function resetCollectCombo({ clearPopups = false } = {}) {
  state.collectComboStreak = 0;
  if (clearPopups) {
    state.comboPopups = [];
  }
}

function comboPopupCenterPoint() {
  const logicMetrics = currentLogicMetrics();
  const layoutState = currentLayoutState();
  return {
    x: logicMetrics.worldWidth * 0.5,
    y: Number.isFinite(layoutState?.gameplayTokens?.tutorialTextY)
      ? layoutState.gameplayTokens.tutorialTextY
      : logicMetrics.worldHeight * 0.58
  };
}

function spawnComboPopup(_origin, praise) {
  const center = comboPopupCenterPoint();
  state.comboPopups.push({
    id: allocateId(),
    text: praise.text,
    color: praise.color,
    outline: praise.outline,
    fontSize: praise.fontSize,
    baseX: center.x,
    baseY: center.y,
    x: center.x,
    y: center.y,
    lifeMs: 0,
    durationMs: COMBO_POPUP_CONFIG.durationMs,
    alpha: 0,
    scale: COMBO_POPUP_CONFIG.baseScale,
    rotation: 0,
    driftX: 0,
    wobbleSeed: Math.random() * Math.PI * 2
  });
}

function registerCollectCombo(origin) {
  state.collectComboStreak += 1;
  const praise = comboPraiseForStreak(state.collectComboStreak);
  if (!praise) {
    return;
  }
  spawnComboPopup(origin, praise);
}

function updateComboPopups(deltaMs) {
  if (state.comboPopups.length === 0) {
    return;
  }

  for (let i = state.comboPopups.length - 1; i >= 0; i -= 1) {
    const popup = state.comboPopups[i];
    popup.lifeMs += deltaMs;
    const t = Math.max(0, Math.min(1, popup.lifeMs / popup.durationMs));
    if (t >= 1) {
      state.comboPopups.splice(i, 1);
      continue;
    }

    const easeOut = 1 - Math.pow(1 - t, 3);
    const rise = COMBO_POPUP_CONFIG.risePx * easeOut;
    popup.x = popup.baseX;
    popup.y = popup.baseY - rise;

    if (popup.lifeMs < COMBO_POPUP_CONFIG.fadeInMs) {
      popup.alpha = popup.lifeMs / COMBO_POPUP_CONFIG.fadeInMs;
    } else if (popup.lifeMs > popup.durationMs - COMBO_POPUP_CONFIG.fadeOutMs) {
      popup.alpha =
        (popup.durationMs - popup.lifeMs) / COMBO_POPUP_CONFIG.fadeOutMs;
    } else {
      popup.alpha = 1;
    }

    const popT = Math.min(1, popup.lifeMs / 180);
    popup.scale =
      COMBO_POPUP_CONFIG.baseScale +
      (COMBO_POPUP_CONFIG.popScale - COMBO_POPUP_CONFIG.baseScale) * Math.sin(popT * Math.PI) * (1 - t * 0.35);
    popup.rotation = Math.sin(popup.wobbleSeed + t * Math.PI * 3) * 0.03 * (1 - t);
  }
}

function resetWorld() {
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
    state.winTimeoutId = null;
  }
  clearScheduledConfettiBurst();
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
  state.spawnResumeAtMs = 0;
  state.spawnUnitWidth = currentSpawnUnitWidth();
  state.currentSpeed = SPEED_CONFIG.base;
  state.isDecelerating = false;
  state.finishLineSpawned = false;
  state.lastStepSoundAt = 0;
  state.skyOffset = 0;
  state.groundOffset = 0;
  state.frozenEnemyAnimationTick = null;
  state.confettiParticles = [];
  state.comboPopups = [];
  state.collectComboStreak = 0;

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

function spawnWarningLabel(x, pulseSeed = Math.random() * Math.PI * 2) {
  state.warningLabels.push({
    id: allocateId(),
    x,
    y: currentGroundY() - 200,
    pulseSeed
  });
}

function spawnEnemy() {
  const spawnX = currentSpawnWorldX();
  const scale = enemyCollisionScale;

  const enemy = {
    id: allocateId(),
    x: spawnX,
    y: 0,
    width: Math.round(enemyBaseFrame.w * scale),
    height: Math.round(enemyBaseFrame.h * scale),
    animationOffset: Math.floor(Math.random() * ASSET_FRAMES.enemyRun.length),
    scale,
    speed: SPEED_CONFIG.base,
    isTutorialEnemy: false
  };

  enemy.y = currentGroundY() - enemy.height;
  state.enemies.push(enemy);
  return enemy;
}

function spawnObstacle() {
  const spawnX = currentSpawnWorldX();
  const width = Math.round(obstacleBaseFrame.w * obstacleBaseScale);
  const height = Math.round(obstacleBaseFrame.h * obstacleBaseScale);

  const obstacle = {
    id: allocateId(),
    x: spawnX,
    width,
    height,
    y: currentGroundY() - height,
    pulseSeed: Math.random() * Math.PI * 2,
    speed: SPEED_CONFIG.base
  };

  state.obstacles.push(obstacle);
  return obstacle;
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
      width: baseWidth * 0.8,
      height: Math.max(1, Math.round(baseHeight * 0.5))
    };
  }

  return { width: baseWidth, height: baseHeight };
}

function adjustedCollectibleYOffset(yOffset = 0) {
  if (!Number.isFinite(yOffset) || yOffset <= 0) {
    return 0;
  }

  return yOffset + collectibleAerialOffsetBoost;
}

function spawnCollectible(yOffset = 0) {
  const spawnX = currentSpawnWorldX();
  const type = Math.random() < 0.6 ? "dollar" : "paypalCard";
  const { width, height } = collectibleRenderSize(type);
  const adjustedYOffset = adjustedCollectibleYOffset(yOffset);
  const baselineLift = adjustedYOffset > 0 ? 0 : collectibleBaseLift;

  const collectible = {
    id: allocateId(),
    x: spawnX,
    width,
    height,
    y: currentGroundY() - height - adjustedYOffset - baselineLift,
    speed: SPEED_CONFIG.base,
    collected: false,
    collectibleType: type,
    bobSeed: Math.random() * Math.PI * 2
  };

  state.collectibles.push(collectible);
}

function spawnFinishLine() {
  const spawnTargetX = currentSpawnWorldX();
  const groundY = currentGroundY();
  const previewGeometry = computeFinishGateGeometry({ x: 0, tapeBroken: false }, groundY, state.resources.images);
  const localMinX = previewGeometry?.bounds?.minX;
  const spawnAnchorX = Number.isFinite(localMinX)
    ? spawnTargetX - localMinX
    : spawnTargetX;

  state.finishLine = {
    id: allocateId(),
    // `x` is the finish gate composition anchor (not the left edge).
    x: spawnAnchorX,
    y: groundY - 182,
    speed: SPEED_CONFIG.base,
    tapeBroken: false,
    tapeBreakElapsedMs: 0,
    tapeBreakProgress: 0
  };
  state.finishLineSpawned = true;
}

function spawnEntity(entry) {
  perfDebugLogger.addSpawn(entry.type);

  if (entry.type === "enemy") {
    const enemy = spawnEnemy();
    if (entry.pauseForTutorial && !state.tutorialTriggered) {
      enemy.isTutorialEnemy = true;
      state.tutorialEnemyId = enemy.id;
    }
    return;
  }

  if (entry.type === "obstacle") {
    const obstacle = spawnObstacle();
    if (entry.warningLabel) {
      spawnWarningLabel(obstacle.x, obstacle.pulseSeed);
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
  const perfStart = perfDebugLogger.enabled ? performance.now() : 0;
  if (state.spawnResumeAtMs > 0 && performance.now() < state.spawnResumeAtMs) {
    if (perfDebugLogger.enabled) {
      perfDebugLogger.setCheckSpawnsMs(performance.now() - perfStart);
    }
    return;
  }

  const logicMetrics = currentLogicMetrics();
  let spawnedThisFrame = 0;
  while (state.spawnIndex < SPAWN_SEQUENCE.length) {
    if (spawnedThisFrame >= SPAWN_RUNTIME_CONFIG.maxSpawnsPerFrame) {
      break;
    }

    const entry = SPAWN_SEQUENCE[state.spawnIndex];
    const spawnDistance = spawnDistanceToPx(entry.distance, logicMetrics);

    if (!shouldSpawn(spawnDistance, state.distanceTraveled, logicMetrics)) {
      break;
    }

    spawnEntity(entry);
    state.spawnIndex += 1;
    spawnedThisFrame += 1;
  }

  if (perfDebugLogger.enabled) {
    perfDebugLogger.setCheckSpawnsMs(performance.now() - perfStart);
  }
}

function updatePlayer(deltaSeconds, deltaMs) {
  state.player.animationTime += deltaSeconds;

  if (state.player.isJumping) {
    state.player.jumpProgress += deltaMs / PLAYER_CONFIG.jumpDurationMs;

    if (state.player.jumpProgress >= 1) {
      state.player.isJumping = false;
      state.player.jumpProgress = 0;
      state.player.y = currentGroundY() - state.player.height;
    } else {
      state.player.y = computeJumpY(state.player.jumpStartY, state.player.jumpProgress, currentLogicMetrics());
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
    if (state.finishLine.tapeBroken && (state.finishLine.tapeBreakProgress ?? 0) < 1) {
      state.finishLine.tapeBreakElapsedMs = (state.finishLine.tapeBreakElapsedMs ?? 0) + deltaSeconds * 1000;
      state.finishLine.tapeBreakProgress = Math.min(
        1,
        state.finishLine.tapeBreakElapsedMs / FINISH_CONFIG.tapeBreakAnimationMs
      );
    }
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

  resetCollectCombo({ clearPopups: true });
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
  registerCollectCombo(from);
  playSound("collect");
}

function checkCollisions() {
  const logicMetrics = currentLogicMetrics();
  const playerBox = playerHitbox(state.player, logicMetrics);

  for (const enemy of state.enemies) {
    if (state.player.invincibilityMs > 0) {
      break;
    }

    if (intersects(playerBox, enemyHitbox(enemy, logicMetrics))) {
      hitPlayer();
      break;
    }
  }

  for (const obstacle of state.obstacles) {
    if (state.player.invincibilityMs > 0) {
      break;
    }

    if (intersects(playerBox, obstacleHitbox(obstacle, logicMetrics))) {
      hitPlayer();
      break;
    }
  }

  for (const collectible of state.collectibles) {
    if (collectible.collected) {
      continue;
    }

    if (collectibleIntersects(playerBox, collectible, logicMetrics)) {
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
    state.finishLine.tapeBreakElapsedMs = 0;
    state.finishLine.tapeBreakProgress = 0;
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

function burstConfettiSide(x, y, angleDeg, textures, countScale = 1, spreadScale = 1) {
  const angleRadians = (angleDeg * Math.PI) / 180;
  const spreadRadians = (CONFETTI_CONFIG.BURST_ANGLE_SPREAD * Math.PI * spreadScale) / 180;
  const particleCount = Math.max(1, Math.round(CONFETTI_CONFIG.PARTICLE_COUNT * countScale));

  for (let i = 0; i < particleCount; i += 1) {
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
  clearScheduledConfettiBurst();

  const textures = confettiTextures();
  if (textures.length === 0) {
    return;
  }

  const logicMetrics = currentLogicMetrics();
  const spawnY = logicMetrics.worldHeight * CONFETTI_CONFIG.SIDE_SPAWN_HEIGHT;
  burstConfettiSide(CONFETTI_CONFIG.SIDE_MARGIN, spawnY, -70, textures);
  burstConfettiSide(logicMetrics.worldWidth - CONFETTI_CONFIG.SIDE_MARGIN, spawnY, -110, textures);

  let remainingBursts = CONFETTI_CONFIG.SECONDARY_BURST_REPEAT_COUNT;
  const runFollowupBurst = () => {
    const followupY = spawnY + (Math.random() - 0.5) * 80;
    burstConfettiSide(
      CONFETTI_CONFIG.SIDE_MARGIN,
      followupY,
      -66,
      textures,
      CONFETTI_CONFIG.SECONDARY_BURST_COUNT_SCALE,
      CONFETTI_CONFIG.SECONDARY_BURST_SPREAD_SCALE
    );
    burstConfettiSide(
      logicMetrics.worldWidth - CONFETTI_CONFIG.SIDE_MARGIN,
      followupY,
      -114,
      textures,
      CONFETTI_CONFIG.SECONDARY_BURST_COUNT_SCALE,
      CONFETTI_CONFIG.SECONDARY_BURST_SPREAD_SCALE
    );

    remainingBursts -= 1;
    if (remainingBursts <= 0) {
      state.confettiBurstTimeoutId = null;
      return;
    }

    state.confettiBurstTimeoutId = setTimeout(runFollowupBurst, CONFETTI_CONFIG.SECONDARY_BURST_DELAY_MS);
  };

  state.confettiBurstTimeoutId = setTimeout(runFollowupBurst, CONFETTI_CONFIG.SECONDARY_BURST_DELAY_MS);
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
  const logicMetrics = currentLogicMetrics();
  const cleanupMarginX = logicMetrics.cleanupMarginX ?? 120;
  const cleanupBehind = Number.isFinite(logicMetrics.cleanupBehindPlayer)
    ? logicMetrics.cleanupBehindPlayer
    : cleanupMarginX;
  const cleanupMinX = currentCleanupMinX();
  state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > cleanupMinX);
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > cleanupMinX);
  state.collectibles = state.collectibles.filter(
    (collectible) =>
      !collectible.collected && collectible.x + collectible.width > cleanupMinX
  );
  state.warningLabels = state.warningLabels.filter((warning) => warning.x > cleanupMinX - (cleanupBehind * 1.2));

  if (state.finishLine) {
    const finishGeometry = currentFinishGateGeometry(state.finishLine);
    const finishMaxX = finishGeometry?.bounds?.maxX;
    if (
      (Number.isFinite(finishMaxX) && finishMaxX < cleanupMinX - (cleanupBehind * 0.5)) ||
      (!Number.isFinite(finishMaxX) && state.finishLine.x < cleanupMinX - cleanupBehind)
    ) {
      state.finishLine = null;
    }
  }
}

function updateRunning(deltaSeconds, deltaMs) {
  const logicMetrics = currentLogicMetrics();
  const groundY = currentGroundY();
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
    const sceneScale = groundY / scene.height;
    const sceneDrawWidth = scene.width * sceneScale;
    const sceneCycle = Math.max(1, sceneDrawWidth * 2);

    state.skyOffset += state.currentSpeed * deltaSeconds;
    if (state.skyOffset > 10_000_000) {
      state.skyOffset %= sceneCycle;
    }
  } else {
    state.skyOffset =
      (state.skyOffset + state.currentSpeed * 0.08 * deltaSeconds) % logicMetrics.worldWidth;
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

  if (state.finishLine && !state.isDecelerating && !state.finishLine.tapeBroken) {
    const finishGeometry = currentFinishGateGeometry(state.finishLine);
    const breakLineX = finishGeometry?.tape?.breakLineX;

    if (Number.isFinite(breakLineX)) {
      const playerBox = playerHitbox(state.player, logicMetrics);
      const playerFrontX = playerBox.x + playerBox.width;
      if (playerFrontX >= breakLineX) {
        startDeceleration();
      }
    }
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
  const viewportState = viewportManager.getState();
  ensureRenderer().render({
    elapsedSeconds,
    state,
    layoutState: viewportState.layoutState || null
  });
}

function update(deltaSeconds, deltaMs) {
  updateConfetti(deltaMs);
  updateComboPopups(deltaMs);

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

  perfDebugLogger.beginFrame(timestamp, deltaMs);

  const updateStart = perfDebugLogger.enabled ? performance.now() : 0;
  update(deltaSeconds, deltaMs);
  if (perfDebugLogger.enabled) {
    perfDebugLogger.setUpdateMs(performance.now() - updateStart);
  }

  const renderStart = perfDebugLogger.enabled ? performance.now() : 0;
  render(timestamp / 1000);
  if (perfDebugLogger.enabled) {
    const frameLogicMetrics = currentLogicMetrics();
    const spawnAhead = Number.isFinite(frameLogicMetrics.spawnAheadFromPlayer)
      ? frameLogicMetrics.spawnAheadFromPlayer
      : frameLogicMetrics.spawnLeadViewportWidth * 1.5;
    const cleanupBehind = Number.isFinite(frameLogicMetrics.cleanupBehindPlayer)
      ? frameLogicMetrics.cleanupBehindPlayer
      : (frameLogicMetrics.cleanupMarginX ?? 120);
    perfDebugLogger.setRenderMs(performance.now() - renderStart);
    perfDebugLogger.setCounts({
      enemies: state.enemies.length,
      obstacles: state.obstacles.length,
      collectibles: state.collectibles.length,
      warnings: state.warningLabels.length,
      comboPopups: state.comboPopups.length,
      hasFinishLine: Boolean(state.finishLine),
      cameraWorldWidth: Math.round(frameLogicMetrics.worldWidth),
      spawnLeadWidth: Math.round(frameLogicMetrics.spawnLeadViewportWidth),
      activeTravelWindowPx: Math.round(spawnAhead + cleanupBehind)
    });
    perfDebugLogger.endFrame();
  }

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
  viewportManager.start();

  try {
    const renderer = ensureRenderer();
    const rendererInitPromise = renderer.init?.();
    const resourcesPromise = loadResources();
    await Promise.all([rendererInitPromise, resourcesPromise]);
    const viewportState = viewportManager.getState();
    renderer.resize?.(viewportState.layoutState || viewportState);
    renderer.prewarm?.({
      state,
      layoutState: viewportState.layoutState || null
    });
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
  viewportManager.stop();
  activeRenderer?.destroy?.();
  if (state.winTimeoutId) {
    clearTimeout(state.winTimeoutId);
  }
  clearScheduledConfettiBurst();
  uiEffects.clearEndTimers();
  for (const objectUrl of state.objectUrlPool) {
    URL.revokeObjectURL(objectUrl);
  }
  state.objectUrlPool.length = 0;
  state.dataUriObjectUrlCache.clear();
});
