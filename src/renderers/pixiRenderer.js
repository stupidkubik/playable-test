import { STATES, computeFinishGateGeometry } from "../gameLogic.js";
import { ASSET_FRAMES } from "../assets/frames.js";

let pixiGlobalPromise = null;
const PIXI_CDN_SRC = "https://cdn.jsdelivr.net/npm/pixi.js@8.16.0/dist/pixi.min.js";

const LAYER_NAMES = Object.freeze([
  "sky",
  "decor",
  "ground",
  "collectibles",
  "obstacles",
  "finish",
  "enemies",
  "warnings",
  "player",
  "fx",
  "comboPopups",
  "tutorialHint"
]);

const DECOR_LAYOUT_BASE_WIDTH = 720;
const DECOR_ITEMS = Object.freeze([
  Object.freeze({ key: "sceneTreeLeft", x: DECOR_LAYOUT_BASE_WIDTH - 1100, y: -40, w: 1000, h: 740 }),
  Object.freeze({ key: "sceneTreeLeft", x: DECOR_LAYOUT_BASE_WIDTH - 600, y: -40, w: 1000, h: 740 }),
  Object.freeze({ key: "sceneLamp", x: DECOR_LAYOUT_BASE_WIDTH - 400, y: 0, w: 200, h: 700 }),
  Object.freeze({ key: "sceneBushSmall", x: DECOR_LAYOUT_BASE_WIDTH - 600, y: 535, w: 165, h: 165 }),
  Object.freeze({ key: "sceneBushLarge", x: DECOR_LAYOUT_BASE_WIDTH - 450, y: 530, w: 220, h: 180 }),
  Object.freeze({ key: "sceneTreeLeft", x: DECOR_LAYOUT_BASE_WIDTH, y: -40, w: 1000, h: 740 }),
  Object.freeze({ key: "sceneBushMedium", x: DECOR_LAYOUT_BASE_WIDTH + 40, y: 530, w: 148, h: 176 }),
  Object.freeze({ key: "sceneLamp", x: DECOR_LAYOUT_BASE_WIDTH + 200, y: 0, w: 200, h: 700 }),
  Object.freeze({ key: "sceneTreeRight", x: DECOR_LAYOUT_BASE_WIDTH + 400, y: -40, w: 1000, h: 740 }),
  Object.freeze({ key: "sceneBushLarge", x: DECOR_LAYOUT_BASE_WIDTH + 300, y: 530, w: 220, h: 180 }),
  Object.freeze({ key: "sceneBushMedium", x: DECOR_LAYOUT_BASE_WIDTH + 560, y: 530, w: 148, h: 172 }),
  Object.freeze({ key: "sceneBushSmall", x: DECOR_LAYOUT_BASE_WIDTH + 900, y: 535, w: 165, h: 165 }),
  Object.freeze({ key: "sceneLamp", x: DECOR_LAYOUT_BASE_WIDTH + 1200, y: 0, w: 200, h: 700 }),
  Object.freeze({ key: "sceneBushLarge", x: DECOR_LAYOUT_BASE_WIDTH + 1400, y: 530, w: 220, h: 180 })
]);

const WARNING_BADGE_BASE_W = 166;
const WARNING_BADGE_BASE_H = 52;
const WARNING_BADGE_RADIUS = 10;
const WARNING_TEXT_STYLE = Object.freeze({
  fontFamily: "GameFont",
  fontSize: 28,
  fontWeight: "900",
  fill: 0xff1f16,
  align: "center"
});

const COMBO_BASE_FONT_SIZE = 56;
const COMBO_SHADOW_STYLE = Object.freeze({
  fontFamily: "GameFont",
  fontSize: COMBO_BASE_FONT_SIZE,
  fontWeight: "800",
  fill: 0x000000,
  align: "center"
});

const COMBO_FRONT_STYLE = Object.freeze({
  fontFamily: "GameFont",
  fontSize: COMBO_BASE_FONT_SIZE,
  fontWeight: "800",
  fill: 0xffffff,
  align: "center"
});

const TUTORIAL_SHADOW_STYLE = Object.freeze({
  fontFamily: "GameFont",
  fontSize: 60,
  fontWeight: "700",
  fill: 0x000000,
  align: "center"
});

const TUTORIAL_FRONT_STYLE = Object.freeze({
  fontFamily: "GameFont",
  fontSize: 60,
  fontWeight: "700",
  fill: 0xffffff,
  align: "center"
});

const MAX_RENDER_RESOLUTION = 1.5;

function pixiScriptSources() {
  const protocol = globalThis.location?.protocol || "";
  const host = globalThis.location?.host || "";
  const isHostedStatic = protocol === "file:" || host.endsWith(".github.io");

  if (isHostedStatic) {
    return [PIXI_CDN_SRC];
  }

  return [
    "/node_modules/pixi.js/dist/pixi.min.js",
    "./node_modules/pixi.js/dist/pixi.min.js",
    PIXI_CDN_SRC
  ];
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-codex-pixi=\"${src}\"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      if (existing.dataset.failed === "true") {
        reject(new Error("Pixi script failed to load"));
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          existing.dataset.failed = "true";
          reject(new Error("Pixi script failed to load"));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.codexPixi = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset.failed = "true";
        reject(new Error("Pixi script failed to load"));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });
}

async function getPixiGlobal() {
  if (globalThis.PIXI) {
    return globalThis.PIXI;
  }

  if (!pixiGlobalPromise) {
    pixiGlobalPromise = (async () => {
      let lastError = null;

      for (const src of pixiScriptSources()) {
        try {
          await loadScript(src);
          if (!globalThis.PIXI) {
            throw new Error("window.PIXI not found after script load");
          }
          return globalThis.PIXI;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("Pixi script failed to load");
    })().catch((error) => {
      pixiGlobalPromise = null;
      throw error;
    });
  }

  return pixiGlobalPromise;
}

function buildLayerContainers(PIXI, stage) {
  const layers = Object.create(null);
  const worldRoot = new PIXI.Container();
  worldRoot.label = "layer-root:world";
  worldRoot.sortableChildren = false;
  layers.worldRoot = worldRoot;
  stage.addChild(worldRoot);

  for (const name of LAYER_NAMES) {
    const container = new PIXI.Container();
    container.label = `layer:${name}`;
    container.sortableChildren = false;
    layers[name] = container;
    worldRoot.addChild(container);
  }

  return layers;
}

function setAnchorIfAvailable(displayObject, x, y = x) {
  if (displayObject?.anchor?.set) {
    displayObject.anchor.set(x, y);
  }
}

function textureForImage(PIXI, textureCache, image) {
  if (!image) {
    return null;
  }

  let texture = textureCache.get(image);
  if (!texture) {
    texture = PIXI.Texture.from(image);
    textureCache.set(image, texture);
  }

  return texture;
}

function frameTextureForSheet(PIXI, frameTextureCache, baseTexture, frame) {
  if (!baseTexture || !frame) {
    return null;
  }

  const key = `${baseTexture.uid}:${frame.x}:${frame.y}:${frame.w}:${frame.h}`;
  let texture = frameTextureCache.get(key);
  if (!texture) {
    texture = new PIXI.Texture({
      source: baseTexture.source,
      frame: new PIXI.Rectangle(frame.x, frame.y, frame.w, frame.h)
    });
    frameTextureCache.set(key, texture);
  }

  return texture;
}

function frameSourceBox(frame) {
  return {
    sourceX: frame.sourceX ?? 0,
    sourceY: frame.sourceY ?? 0,
    sourceW: frame.sourceW ?? frame.w,
    sourceH: frame.sourceH ?? frame.h
  };
}

function currentPlayerFrame(sceneState) {
  const idleFrames = ASSET_FRAMES.playerIdle || ASSET_FRAMES.playerRun;
  const runFrames = ASSET_FRAMES.playerRun;
  const jumpFrames = ASSET_FRAMES.playerJump;
  const player = sceneState?.player;

  if (!player || !idleFrames?.length || !runFrames?.length || !jumpFrames?.length) {
    return null;
  }

  if (sceneState.mode === STATES.endWin || sceneState.mode === STATES.endLose) {
    return idleFrames[0];
  }

  if (player.isJumping) {
    return jumpFrames[Math.floor(player.animationTime * 12) % jumpFrames.length];
  }

  if (sceneState.mode === STATES.paused) {
    return idleFrames[0];
  }

  if (sceneState.mode === STATES.running) {
    return runFrames[Math.floor(player.animationTime * 12) % runFrames.length];
  }

  if (sceneState.mode === STATES.intro) {
    return idleFrames[Math.floor(player.animationTime * 9) % idleFrames.length];
  }

  return runFrames[0];
}

function tutorialHandPulseScale(elapsedSeconds) {
  const cycleSeconds = 1.1;
  const phase = (elapsedSeconds % cycleSeconds) / cycleSeconds;
  return 0.97 - 0.09 * Math.cos(phase * Math.PI * 2);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutSine01(value) {
  const t = clamp01(value);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function interpolateKeyframes01(keyframes, value) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return 0;
  }

  const t = clamp01(value);
  if (t <= keyframes[0].t) {
    return keyframes[0].value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const prev = keyframes[index - 1];
    const next = keyframes[index];
    if (t <= next.t) {
      const span = Math.max(1e-6, next.t - prev.t);
      const local = (t - prev.t) / span;
      return prev.value + (next.value - prev.value) * easeInOutSine01(local);
    }
  }

  return keyframes[keyframes.length - 1].value;
}

function createPool() {
  return {
    active: new Map(),
    free: [],
    used: new Set()
  };
}

function beginPoolFrame(pool) {
  pool.used.clear();
}

function acquirePoolNode(pool, id, factory) {
  let node = pool.active.get(id);
  if (!node) {
    node = pool.free.pop() || factory();
    pool.active.set(id, node);
  }
  pool.used.add(id);
  return node;
}

function releasePoolUnused(pool, onRelease) {
  for (const [id, node] of pool.active.entries()) {
    if (pool.used.has(id)) {
      continue;
    }
    pool.active.delete(id);
    onRelease?.(node);
    pool.free.push(node);
  }
}

function hideDisplay(node) {
  if (node?.visible !== undefined) {
    node.visible = false;
  }
}

function visibleDisplay(node, value = true) {
  if (node?.visible !== undefined) {
    node.visible = value;
  }
}

function hasNumber(value) {
  return Number.isFinite(value);
}

export function createPixiRenderer(options = {}) {
  const { canvas, width = 720, height = 1280, onUnavailable } = options;

  let app = null;
  let pixiCanvas = null;
  let layers = null;
  let initialized = false;
  let unavailable = false;
  let fallbackNoticeShown = false;
  let PIXIRef = null;
  const textureCache = new WeakMap();
  const frameTextureCache = new Map();
  let originalCanvasInlineOpacity = "";
  let originalCanvasInlineBackground = "";
  let originalCanvasInlinePosition = "";
  let originalCanvasInlineZIndex = "";
  let lastAppliedPixelRatio = null;
  let prewarmed = false;

  const skyState = {
    sprites: [],
    fallbackRect: null,
    fallbackLastWidth: 0,
    fallbackLastHeight: 0,
    fallbackLastGroundY: 0
  };

  const decorState = {
    sprites: []
  };

  const groundFallbackState = {
    container: null,
    groundRect: null,
    stripes: [],
    stripeCount: 0,
    lastWidth: 0,
    lastHeight: 0,
    lastGroundY: 0,
    lastOffsetKey: null
  };

  const finishState = {
    floor: null,
    leftPole: null,
    rightPole: null,
    leftTape: null,
    rightTape: null,
    leftPoleFallback: null,
    rightPoleFallback: null
  };

  const playerState = {
    sprite: null,
    flash: null,
    fallback: null
  };

  const tutorialState = {
    container: null,
    shadowText: null,
    frontText: null,
    hand: null
  };

  const enemyPool = createPool();
  const obstaclePool = createPool();
  const collectiblePool = createPool();
  const warningPool = createPool();
  const comboPool = {
    nodes: []
  };
  const confettiPool = {
    sprites: []
  };

  function warnUnavailableOnce(reason) {
    if (fallbackNoticeShown) {
      return;
    }
    fallbackNoticeShown = true;
    console.warn(`[renderer] Pixi backend unavailable: ${reason}`);
  }

  function restoreCanvasInputLayer() {
    if (!canvas) {
      return;
    }
    canvas.style.opacity = originalCanvasInlineOpacity;
    canvas.style.background = originalCanvasInlineBackground;
    canvas.style.position = originalCanvasInlinePosition;
    canvas.style.zIndex = originalCanvasInlineZIndex;
  }

  function applyViewportStylesToPixiCanvas() {
    if (!pixiCanvas) {
      return;
    }

    pixiCanvas.style.inset = "";
    pixiCanvas.style.left = "var(--game-viewport-x, 0px)";
    pixiCanvas.style.top = "var(--game-viewport-y, 0px)";
    pixiCanvas.style.width = "var(--game-viewport-w, 100%)";
    pixiCanvas.style.height = "var(--game-viewport-h, 100%)";
  }

  function syncRendererResolution(viewportState) {
    if (!app?.renderer) {
      return;
    }

    const requested = viewportState?.pixelRatio || globalThis.devicePixelRatio || 1;
    const nextPixelRatio = Math.min(MAX_RENDER_RESOLUTION, Math.max(1, requested));
    if (lastAppliedPixelRatio === nextPixelRatio) {
      return;
    }

    lastAppliedPixelRatio = nextPixelRatio;

    try {
      if ("resolution" in app.renderer) {
        app.renderer.resolution = nextPixelRatio;
      }
      app.renderer.resize(width, height);
    } catch {
      // Best-effort for API differences across Pixi versions.
    }
  }

  function resolveFrameWorldMetrics(frame) {
    const layoutState = frame?.layoutState;
    const cameraViewWorldRect = layoutState?.cameraViewWorldRect;
    const gameplayTokens = layoutState?.gameplayTokens;
    const worldWidth = hasNumber(cameraViewWorldRect?.width) ? cameraViewWorldRect.width : width;
    const worldHeight = hasNumber(cameraViewWorldRect?.height) ? cameraViewWorldRect.height : height;
    const worldY = hasNumber(cameraViewWorldRect?.y) ? cameraViewWorldRect.y : 0;
    const fallbackGroundY = options.groundY ?? height * 0.66;
    const runtimeGroundY = gameplayTokens?.runtimeGroundY;
    const groundY = hasNumber(runtimeGroundY)
      ? runtimeGroundY
      : fallbackGroundY;

    return {
      worldY,
      worldWidth,
      worldHeight,
      groundY: Math.max(worldY, Math.min(worldY + worldHeight, groundY))
    };
  }

  function syncWorldRootTransform(frame) {
    const worldRoot = layers?.worldRoot;
    if (!worldRoot) {
      return;
    }

    const layoutState = frame?.layoutState;
    const cameraViewWorldRect = layoutState?.cameraViewWorldRect;
    const cameraTransform = layoutState?.cameraTransform;
    const worldViewportRect = layoutState?.worldViewportRect;

    if (
      !cameraViewWorldRect ||
      !cameraTransform ||
      !worldViewportRect ||
      !hasNumber(cameraTransform.scale) ||
      !hasNumber(worldViewportRect.width) ||
      !hasNumber(worldViewportRect.height) ||
      worldViewportRect.width <= 0 ||
      worldViewportRect.height <= 0
    ) {
      worldRoot.x = 0;
      worldRoot.y = 0;
      worldRoot.scale.set(1, 1);
      worldRoot.rotation = 0;
      worldRoot.alpha = 1;
      worldRoot.visible = true;
      return;
    }

    const canvasScaleX = worldViewportRect.width / width;
    const canvasScaleY = worldViewportRect.height / height;
    const scaleX = cameraTransform.scale / canvasScaleX;
    const scaleY = cameraTransform.scale / canvasScaleY;
    const viewportRectX = hasNumber(worldViewportRect.x) ? worldViewportRect.x : 0;
    const viewportRectY = hasNumber(worldViewportRect.y) ? worldViewportRect.y : 0;
    const cameraWorldX = hasNumber(cameraViewWorldRect.x) ? cameraViewWorldRect.x : 0;
    const cameraWorldY = hasNumber(cameraViewWorldRect.y) ? cameraViewWorldRect.y : 0;
    const viewportLocalOffsetX = cameraTransform.offsetX - viewportRectX;
    const viewportLocalOffsetY = cameraTransform.offsetY - viewportRectY;

    worldRoot.x = viewportLocalOffsetX / canvasScaleX - cameraWorldX * scaleX;
    worldRoot.y = viewportLocalOffsetY / canvasScaleY - cameraWorldY * scaleY;
    worldRoot.scale.set(scaleX, scaleY);
    worldRoot.rotation = 0;
    worldRoot.alpha = 1;
    worldRoot.visible = true;
  }

  function ensureSkyFallback() {
    if (skyState.fallbackRect) {
      return skyState.fallbackRect;
    }
    const fallback = new PIXIRef.Graphics();
    fallback.visible = false;
    layers.sky.addChild(fallback);
    skyState.fallbackRect = fallback;
    return fallback;
  }

  function ensureSkySprite(index) {
    if (skyState.sprites[index]) {
      return skyState.sprites[index];
    }

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    layers.sky.addChild(sprite);
    skyState.sprites[index] = sprite;
    return sprite;
  }

  function syncSkyLayer(sceneState, worldWidth, groundY, worldHeight) {
    const scene = sceneState?.resources?.images?.sceneBackground;
    const sceneTexture = textureForImage(PIXIRef, textureCache, scene);

    if (!sceneTexture || !scene?.height) {
      for (const sprite of skyState.sprites) {
        hideDisplay(sprite);
      }

      const fallback = ensureSkyFallback();
      if (
        skyState.fallbackLastWidth !== worldWidth ||
        skyState.fallbackLastHeight !== worldHeight ||
        skyState.fallbackLastGroundY !== groundY
      ) {
        fallback.clear();
        fallback.rect(0, 0, worldWidth, groundY).fill(0x8dc3ea);
        skyState.fallbackLastWidth = worldWidth;
        skyState.fallbackLastHeight = worldHeight;
        skyState.fallbackLastGroundY = groundY;
      }
      visibleDisplay(fallback, true);
      return;
    }

    if (skyState.fallbackRect) {
      hideDisplay(skyState.fallbackRect);
    }

    const scale = worldHeight / scene.height;
    const drawWidth = Math.max(1, scene.width * scale);
    const baseTileIndexStart = Math.floor((sceneState?.skyOffset || 0) / drawWidth);
    const wrappedOffset = ((((sceneState?.skyOffset || 0) % drawWidth) + drawWidth) % drawWidth);
    const tileIndexStart = baseTileIndexStart - 1;
    const tileStartX = -wrappedOffset - drawWidth;
    const tileCount = Math.ceil(worldWidth / drawWidth) + 3;

    for (let i = 0; i < tileCount; i += 1) {
      const tileIndex = tileIndexStart + i;
      const tileX = tileStartX + i * drawWidth;
      const mirrored = tileIndex % 2 !== 0;
      const sprite = ensureSkySprite(i);
      sprite.texture = sceneTexture;
      sprite.x = mirrored ? tileX + drawWidth : tileX;
      sprite.y = 0;
      sprite.scale.set(mirrored ? -scale : scale, scale);
      visibleDisplay(sprite, true);
    }

    for (let i = tileCount; i < skyState.sprites.length; i += 1) {
      hideDisplay(skyState.sprites[i]);
    }
  }

  function ensureGroundFallback() {
    if (groundFallbackState.container) {
      return groundFallbackState;
    }

    const container = new PIXIRef.Container();
    container.visible = false;
    layers.ground.addChild(container);

    const groundRect = new PIXIRef.Graphics();
    container.addChild(groundRect);

    groundFallbackState.container = container;
    groundFallbackState.groundRect = groundRect;
    return groundFallbackState;
  }

  function ensureGroundStripe(index) {
    if (groundFallbackState.stripes[index]) {
      return groundFallbackState.stripes[index];
    }

    const stripe = new PIXIRef.Graphics();
    stripe.visible = false;
    groundFallbackState.container.addChild(stripe);
    groundFallbackState.stripes[index] = stripe;
    return stripe;
  }

  function syncGroundLayer(sceneState, worldWidth, groundY, worldHeight) {
    if (sceneState?.resources?.images?.sceneBackground) {
      if (groundFallbackState.container) {
        hideDisplay(groundFallbackState.container);
      }
      return;
    }

    const fallback = ensureGroundFallback();
    visibleDisplay(fallback.container, true);

    if (
      groundFallbackState.lastWidth !== worldWidth ||
      groundFallbackState.lastHeight !== worldHeight ||
      groundFallbackState.lastGroundY !== groundY
    ) {
      fallback.groundRect.clear();
      fallback.groundRect.rect(0, groundY, worldWidth, Math.max(1, worldHeight - groundY)).fill(0x1f2f3e);
      groundFallbackState.lastWidth = worldWidth;
      groundFallbackState.lastHeight = worldHeight;
      groundFallbackState.lastGroundY = groundY;
    }

    const offset = sceneState?.groundOffset || 0;
    const stripeOffset = offset % 56;
    if (groundFallbackState.lastOffsetKey === stripeOffset && groundFallbackState.stripeCount > 0) {
      return;
    }

    const stripeCount = Math.ceil(worldWidth / 56) + 4;
    for (let i = 0; i < stripeCount; i += 1) {
      const stripe = ensureGroundStripe(i);
      const x = (i - 1) * 56 - stripeOffset;
      stripe.clear();
      stripe.rect(x, groundY + 42, 34, 11).fill(0x283f52);
      visibleDisplay(stripe, true);
    }

    for (let i = stripeCount; i < groundFallbackState.stripes.length; i += 1) {
      hideDisplay(groundFallbackState.stripes[i]);
    }

    groundFallbackState.stripeCount = stripeCount;
    groundFallbackState.lastOffsetKey = stripeOffset;
  }

  function ensureDecorSprite(index) {
    if (decorState.sprites[index]) {
      return decorState.sprites[index];
    }

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    layers.decor.addChild(sprite);
    decorState.sprites[index] = sprite;
    return sprite;
  }

  function syncDecorLayer(sceneState, visibleWorldWidth, groundY) {
    const images = sceneState?.resources?.images;
    const scene = images?.sceneBackground;
    if (!scene || !scene.height) {
      for (const sprite of decorState.sprites) {
        hideDisplay(sprite);
      }
      return;
    }

    const textureByKey = {
      sceneTreeLeft: textureForImage(PIXIRef, textureCache, images.sceneTreeLeft),
      sceneTreeRight: textureForImage(PIXIRef, textureCache, images.sceneTreeRight),
      sceneBushLarge: textureForImage(PIXIRef, textureCache, images.sceneBushLarge),
      sceneBushMedium: textureForImage(PIXIRef, textureCache, images.sceneBushMedium),
      sceneBushSmall: textureForImage(PIXIRef, textureCache, images.sceneBushSmall),
      sceneLamp: textureForImage(PIXIRef, textureCache, images.sceneLamp)
    };

    const sceneScale = groundY / scene.height;
    const sceneDrawWidth = Math.max(1, scene.width * sceneScale);
    const tileIndexStart = Math.floor((sceneState?.skyOffset || 0) / sceneDrawWidth);
    const wrappedOffset = ((((sceneState?.skyOffset || 0) % sceneDrawWidth) + sceneDrawWidth) % sceneDrawWidth);
    const tileStartX = -wrappedOffset;
    const tileCount = Math.ceil(visibleWorldWidth / sceneDrawWidth) + 2;

    let spriteIndex = 0;
    for (let i = 0; i < tileCount; i += 1) {
      const tileIndex = tileIndexStart + i;
      const tileX = tileStartX + i * sceneDrawWidth;
      const mirrored = tileIndex % 2 !== 0;

      for (const item of DECOR_ITEMS) {
        const sprite = ensureDecorSprite(spriteIndex);
        spriteIndex += 1;

        const texture = textureByKey[item.key];
        if (!texture) {
          hideDisplay(sprite);
          continue;
        }

        const scaleX = item.w / texture.width;
        const scaleY = item.h / texture.height;
        sprite.texture = texture;
        sprite.x = mirrored ? tileX + (sceneDrawWidth - item.x) : tileX + item.x;
        sprite.y = item.y;
        sprite.scale.set(mirrored ? -scaleX : scaleX, scaleY);
        visibleDisplay(sprite, true);
      }
    }

    for (let i = spriteIndex; i < decorState.sprites.length; i += 1) {
      hideDisplay(decorState.sprites[i]);
    }
  }

  function ensurePlayerNodes() {
    if (playerState.sprite) {
      return playerState;
    }

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    layers.player.addChild(sprite);

    const flash = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    flash.visible = false;
    layers.player.addChild(flash);

    const fallback = new PIXIRef.Graphics();
    fallback.visible = false;
    layers.player.addChild(fallback);

    playerState.sprite = sprite;
    playerState.flash = flash;
    playerState.fallback = fallback;
    return playerState;
  }

  function syncPlayerLayer(sceneState) {
    const player = sceneState?.player;
    const nodes = ensurePlayerNodes();

    if (!player) {
      hideDisplay(nodes.sprite);
      hideDisplay(nodes.flash);
      hideDisplay(nodes.fallback);
      return;
    }

    const spriteSheetImage = sceneState.resources?.images?.playerSheet;
    const baseTexture = textureForImage(PIXIRef, textureCache, spriteSheetImage);
    const frame = currentPlayerFrame(sceneState);

    if (!baseTexture || !frame) {
      hideDisplay(nodes.sprite);
      hideDisplay(nodes.flash);
      nodes.fallback.clear();
      nodes.fallback.rect(player.x, player.y, player.width, player.height).fill(0xf2664b);
      visibleDisplay(nodes.fallback, true);
      return;
    }

    hideDisplay(nodes.fallback);

    const box = frameSourceBox(frame);
    const targetHeight = player.height * 1.58;
    const drawScale = targetHeight / box.sourceH;
    const fullWidth = box.sourceW * drawScale;
    const fullHeight = box.sourceH * drawScale;
    const fullX = player.x + (player.width - fullWidth) * 0.5;
    const fullY = player.y + (player.height - fullHeight);
    const drawX = fullX + box.sourceX * drawScale;
    const drawY = fullY + box.sourceY * drawScale;
    const drawWidth = frame.w * drawScale;
    const drawHeight = frame.h * drawScale;
    const frameTexture = frameTextureForSheet(PIXIRef, frameTextureCache, baseTexture, frame);

    if (!frameTexture) {
      hideDisplay(nodes.sprite);
      hideDisplay(nodes.flash);
      return;
    }

    nodes.sprite.texture = frameTexture;
    nodes.sprite.x = drawX;
    nodes.sprite.y = drawY;
    nodes.sprite.scale.set(drawWidth / frame.w, drawHeight / frame.h);
    visibleDisplay(nodes.sprite, true);

    const damageFlashActive = player.invincibilityMs > 0 && !player.blinkVisible;
    if (damageFlashActive) {
      nodes.flash.texture = frameTexture;
      nodes.flash.x = drawX;
      nodes.flash.y = drawY;
      nodes.flash.scale.set(drawWidth / frame.w, drawHeight / frame.h);
      nodes.flash.tint = 0xff3a3a;
      nodes.flash.alpha = 0.62;
      visibleDisplay(nodes.flash, true);
    } else {
      hideDisplay(nodes.flash);
    }
  }

  function createEnemyNode() {
    const container = new PIXIRef.Container();
    container.visible = false;

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    container.addChild(sprite);

    const fallback = new PIXIRef.Graphics();
    fallback.visible = false;
    container.addChild(fallback);

    layers.enemies.addChild(container);

    return {
      container,
      sprite,
      fallback
    };
  }

  function hideEnemyNode(node) {
    hideDisplay(node?.container);
    hideDisplay(node?.sprite);
    hideDisplay(node?.fallback);
  }

  function syncEnemyLayer(sceneState, elapsedSeconds) {
    const enemies = sceneState?.enemies || [];
    beginPoolFrame(enemyPool);

    const spriteSheetImage = sceneState?.resources?.images?.enemySheet;
    const baseTexture = textureForImage(PIXIRef, textureCache, spriteSheetImage);
    const sequence = ASSET_FRAMES.enemyRun || [];
    const frozenTick = sceneState?.frozenEnemyAnimationTick;
    const freezeEnemyAnimation =
      sceneState?.mode === STATES.paused ||
      sceneState?.mode === STATES.endLose;
    const fallbackFrozenTick = hasNumber(frozenTick) ? frozenTick : 0;

    for (const enemy of enemies) {
      const node = acquirePoolNode(enemyPool, enemy.id, createEnemyNode);
      const frameTick = freezeEnemyAnimation ? fallbackFrozenTick : Math.floor(elapsedSeconds * 10);

      if (!baseTexture || sequence.length === 0) {
        hideDisplay(node.sprite);
        node.fallback.clear();
        node.fallback.rect(enemy.x, enemy.y, enemy.width, enemy.height).fill(0x263947);
        visibleDisplay(node.fallback, true);
        visibleDisplay(node.container, true);
        continue;
      }

      const frame = sequence[(frameTick + enemy.animationOffset) % sequence.length];
      const box = frameSourceBox(frame);
      const drawScale = (enemy.scale || 0.44) * 1.12;
      const fullWidth = box.sourceW * drawScale;
      const fullHeight = box.sourceH * drawScale;
      const fullX = enemy.x + (enemy.width - fullWidth) * 0.5;
      const fullY = enemy.y + (enemy.height - fullHeight);
      const drawX = fullX + (box.sourceW - box.sourceX - frame.w) * drawScale;
      const drawY = fullY + box.sourceY * drawScale;
      const drawWidth = frame.w * drawScale;
      const drawHeight = frame.h * drawScale;
      const frameTexture = frameTextureForSheet(PIXIRef, frameTextureCache, baseTexture, frame);

      if (!frameTexture) {
        hideDisplay(node.sprite);
        hideDisplay(node.fallback);
        hideDisplay(node.container);
        continue;
      }

      hideDisplay(node.fallback);
      node.sprite.texture = frameTexture;
      node.sprite.x = drawX + drawWidth;
      node.sprite.y = drawY;
      node.sprite.scale.set(-(drawWidth / frame.w), drawHeight / frame.h);
      visibleDisplay(node.sprite, true);
      visibleDisplay(node.container, true);
    }

    releasePoolUnused(enemyPool, hideEnemyNode);
  }

  function createObstacleNode() {
    const container = new PIXIRef.Container();
    container.visible = false;

    const glow = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    glow.visible = false;
    container.addChild(glow);

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    container.addChild(sprite);

    const fallback = new PIXIRef.Graphics();
    fallback.visible = false;
    container.addChild(fallback);

    layers.obstacles.addChild(container);

    return {
      container,
      glow,
      sprite,
      fallback
    };
  }

  function hideObstacleNode(node) {
    hideDisplay(node?.container);
    hideDisplay(node?.glow);
    hideDisplay(node?.sprite);
    hideDisplay(node?.fallback);
  }

  function syncObstaclesLayer(sceneState, elapsedSeconds) {
    const obstacles = sceneState?.obstacles || [];
    beginPoolFrame(obstaclePool);

    const obstacleSpriteTexture = textureForImage(PIXIRef, textureCache, sceneState?.resources?.images?.obstacleSprite);
    const obstacleGlowTexture = textureForImage(PIXIRef, textureCache, sceneState?.resources?.images?.obstacleGlow);
    const obstacleAnimSeconds = sceneState?.mode === STATES.endLose ? 0 : elapsedSeconds;

    for (const obstacle of obstacles) {
      const node = acquirePoolNode(obstaclePool, obstacle.id, createObstacleNode);
      const pulse = 1 + Math.sin(obstacleAnimSeconds * 3 + obstacle.pulseSeed) * 0.1;

      if (obstacleGlowTexture) {
        const glowWidth = obstacle.width * pulse;
        const glowHeight = obstacle.height * pulse;
        const glowX = obstacle.x - (glowWidth - obstacle.width) * 0.5;
        const glowY = obstacle.y - (glowHeight - obstacle.height);
        node.glow.texture = obstacleGlowTexture;
        node.glow.x = glowX;
        node.glow.y = glowY;
        node.glow.scale.set(glowWidth / obstacleGlowTexture.width, glowHeight / obstacleGlowTexture.height);
        node.glow.alpha = 0.85;
        visibleDisplay(node.glow, true);
      } else {
        hideDisplay(node.glow);
      }

      if (obstacleSpriteTexture) {
        node.sprite.texture = obstacleSpriteTexture;
        node.sprite.x = obstacle.x;
        node.sprite.y = obstacle.y;
        node.sprite.scale.set(obstacle.width / obstacleSpriteTexture.width, obstacle.height / obstacleSpriteTexture.height);
        visibleDisplay(node.sprite, true);
        hideDisplay(node.fallback);
      } else {
        hideDisplay(node.sprite);
        const fallbackPulse = 1 + Math.sin(obstacleAnimSeconds * 4 + obstacle.pulseSeed) * 0.05;
        const widthScaled = obstacle.width * fallbackPulse;
        const heightScaled = obstacle.height * fallbackPulse;
        const x = obstacle.x - (widthScaled - obstacle.width) * 0.5;
        const y = obstacle.y - (heightScaled - obstacle.height);
        node.fallback.clear();
        node.fallback.roundRect(x, y, widthScaled, heightScaled, 14).fill({ color: 0xffc840, alpha: 0.32 });
        visibleDisplay(node.fallback, true);
      }

      visibleDisplay(node.container, true);
    }

    releasePoolUnused(obstaclePool, hideObstacleNode);
  }

  function createCollectibleNode() {
    const container = new PIXIRef.Container();
    container.visible = false;

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    container.addChild(sprite);

    const fallbackCard = new PIXIRef.Graphics();
    fallbackCard.visible = false;
    container.addChild(fallbackCard);

    const fallbackCoin = new PIXIRef.Graphics();
    fallbackCoin.visible = false;
    container.addChild(fallbackCoin);

    layers.collectibles.addChild(container);

    return {
      container,
      sprite,
      fallbackCard,
      fallbackCoin
    };
  }

  function hideCollectibleNode(node) {
    hideDisplay(node?.container);
    hideDisplay(node?.sprite);
    hideDisplay(node?.fallbackCard);
    hideDisplay(node?.fallbackCoin);
  }

  function syncCollectiblesLayer(sceneState, elapsedSeconds) {
    const collectibles = sceneState?.collectibles || [];
    beginPoolFrame(collectiblePool);

    const iconTexture = textureForImage(PIXIRef, textureCache, sceneState?.resources?.images?.collectibleIcon);
    const paypalTexture = textureForImage(
      PIXIRef,
      textureCache,
      sceneState?.resources?.images?.paypalCardCollectible || sceneState?.resources?.images?.paypalCard
    );

    for (const collectible of collectibles) {
      const node = acquirePoolNode(collectiblePool, collectible.id, createCollectibleNode);
      const bob = Math.sin(elapsedSeconds * 4 + collectible.bobSeed) * 10;
      const y = collectible.y + bob;

      if (collectible.collectibleType === "paypalCard") {
        if (paypalTexture) {
          node.sprite.texture = paypalTexture;
          node.sprite.x = collectible.x;
          node.sprite.y = y;
          node.sprite.scale.set(
            collectible.width / paypalTexture.width,
            collectible.height / paypalTexture.height
          );
          visibleDisplay(node.sprite, true);
          hideDisplay(node.fallbackCard);
          hideDisplay(node.fallbackCoin);
        } else {
          hideDisplay(node.sprite);
          hideDisplay(node.fallbackCoin);
          node.fallbackCard.clear();
          node.fallbackCard.roundRect(collectible.x, y, collectible.width, collectible.height * 0.68, 10).fill(0x1756c6);
          visibleDisplay(node.fallbackCard, true);
        }
      } else if (iconTexture) {
        node.sprite.texture = iconTexture;
        node.sprite.x = collectible.x;
        node.sprite.y = y;
        node.sprite.scale.set(collectible.width / iconTexture.width, collectible.height / iconTexture.height);
        visibleDisplay(node.sprite, true);
        hideDisplay(node.fallbackCard);
        hideDisplay(node.fallbackCoin);
      } else {
        hideDisplay(node.sprite);
        hideDisplay(node.fallbackCard);
        node.fallbackCoin.clear();
        node.fallbackCoin.circle(
          collectible.x + collectible.width * 0.5,
          y + collectible.height * 0.5,
          collectible.width * 0.5
        ).fill(0xffe170);
        visibleDisplay(node.fallbackCoin, true);
      }

      visibleDisplay(node.container, true);
    }

    releasePoolUnused(collectiblePool, hideCollectibleNode);
  }

  function ensureFinishNodes() {
    if (finishState.floor) {
      return finishState;
    }

    finishState.floor = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    finishState.leftPole = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    finishState.rightPole = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    finishState.leftTape = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    finishState.rightTape = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    finishState.leftPoleFallback = new PIXIRef.Graphics();
    finishState.rightPoleFallback = new PIXIRef.Graphics();

    layers.finish.addChild(finishState.floor);
    layers.finish.addChild(finishState.leftPole);
    layers.finish.addChild(finishState.rightPole);
    layers.finish.addChild(finishState.leftTape);
    layers.finish.addChild(finishState.rightTape);
    layers.finish.addChild(finishState.leftPoleFallback);
    layers.finish.addChild(finishState.rightPoleFallback);

    hideDisplay(finishState.floor);
    hideDisplay(finishState.leftPole);
    hideDisplay(finishState.rightPole);
    hideDisplay(finishState.leftTape);
    hideDisplay(finishState.rightTape);
    hideDisplay(finishState.leftPoleFallback);
    hideDisplay(finishState.rightPoleFallback);

    return finishState;
  }

  function applyScaledSprite(sprite, texture, x, y, widthValue, heightValue) {
    if (!sprite || !texture) {
      return;
    }
    sprite.texture = texture;
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = 0;
    sprite.scale.set(widthValue / texture.width, heightValue / texture.height);
    visibleDisplay(sprite, true);
  }

  function applyRotatedSprite(sprite, texture, source) {
    if (!sprite || !texture || !source) {
      return;
    }
    sprite.texture = texture;
    sprite.x = source.x;
    sprite.y = source.y;
    sprite.rotation = source.rotation || 0;
    setAnchorIfAvailable(sprite, source.anchorX ?? 0.5, source.anchorY ?? 0.5);
    sprite.scale.set(source.width / texture.width, source.height / texture.height);
    visibleDisplay(sprite, true);
  }

  function syncFinishLayer(sceneState, groundY) {
    const finish = sceneState?.finishLine;
    const nodes = ensureFinishNodes();

    if (!finish) {
      hideDisplay(nodes.floor);
      hideDisplay(nodes.leftPole);
      hideDisplay(nodes.rightPole);
      hideDisplay(nodes.leftTape);
      hideDisplay(nodes.rightTape);
      hideDisplay(nodes.leftPoleFallback);
      hideDisplay(nodes.rightPoleFallback);
      return;
    }

    const images = sceneState.resources?.images || {};
    const floorPattern = textureForImage(PIXIRef, textureCache, images.finishFloorPattern);
    const leftPole = textureForImage(PIXIRef, textureCache, images.finishPoleLeft);
    const rightPole = textureForImage(PIXIRef, textureCache, images.finishPoleRight);
    const leftTape = textureForImage(PIXIRef, textureCache, images.finishTapeLeft);
    const rightTape = textureForImage(PIXIRef, textureCache, images.finishTapeRight);
    const finishGeometry = computeFinishGateGeometry(finish, groundY, images);

    const canUseSpriteFinish =
      floorPattern &&
      leftPole &&
      rightPole &&
      leftTape &&
      rightTape &&
      finishGeometry;

    if (canUseSpriteFinish) {
      const floorSprite = finishGeometry.sprites.floor;
      const leftPoleSprite = finishGeometry.sprites.leftPole;
      const rightPoleSprite = finishGeometry.sprites.rightPole;
      const leftTapeSprite = finishGeometry.sprites.leftTape;
      const rightTapeSprite = finishGeometry.sprites.rightTape;
      const tapeBreakProgress = hasNumber(finish?.tapeBreakProgress)
        ? clamp01(finish.tapeBreakProgress)
        : finish?.tapeBroken
          ? 1
          : 0;

      const leftTapeSkewY = interpolateKeyframes01(
        [
          { t: 0, value: 0 },
          { t: 0.14, value: 0 },
          { t: 0.3, value: -0.22 },
          { t: 0.52, value: 0.14 },
          { t: 0.74, value: -0.08 },
          { t: 1, value: 0 }
        ],
        tapeBreakProgress
      );
      const rightTapeSkewY = interpolateKeyframes01(
        [
          { t: 0, value: 0 },
          { t: 0.14, value: 0 },
          { t: 0.3, value: 0.22 },
          { t: 0.54, value: -0.14 },
          { t: 0.76, value: 0.08 },
          { t: 1, value: 0 }
        ],
        tapeBreakProgress
      );
      const leftTapeSkewX = interpolateKeyframes01(
        [
          { t: 0, value: 0 },
          { t: 0.34, value: 0.05 },
          { t: 0.58, value: -0.035 },
          { t: 1, value: 0 }
        ],
        tapeBreakProgress
      );
      const rightTapeSkewX = interpolateKeyframes01(
        [
          { t: 0, value: 0 },
          { t: 0.34, value: -0.05 },
          { t: 0.58, value: 0.035 },
          { t: 1, value: 0 }
        ],
        tapeBreakProgress
      );

      applyScaledSprite(nodes.floor, floorPattern, floorSprite.x, floorSprite.y, floorSprite.width, floorSprite.height);
      applyRotatedSprite(nodes.leftPole, leftPole, leftPoleSprite);
      applyRotatedSprite(nodes.rightPole, rightPole, rightPoleSprite);
      applyRotatedSprite(nodes.leftTape, leftTape, leftTapeSprite);
      applyRotatedSprite(nodes.rightTape, rightTape, rightTapeSprite);

      if (nodes.leftTape?.skew?.set) {
        nodes.leftTape.skew.set(leftTapeSkewX, leftTapeSkewY);
      }
      if (nodes.rightTape?.skew?.set) {
        nodes.rightTape.skew.set(rightTapeSkewX, rightTapeSkewY);
      }

      hideDisplay(nodes.leftPoleFallback);
      hideDisplay(nodes.rightPoleFallback);
      return;
    }

    hideDisplay(nodes.floor);
    hideDisplay(nodes.leftPole);
    hideDisplay(nodes.rightPole);
    hideDisplay(nodes.leftTape);
    hideDisplay(nodes.rightTape);

    const leftPoleX = finish.x - 50;
    const rightPoleX = finish.x + 62;
    const poleTopY = finish.y;

    nodes.leftPoleFallback.clear();
    nodes.leftPoleFallback.roundRect(leftPoleX, poleTopY - 10, 16, 190, 6).fill(0xffffff);
    visibleDisplay(nodes.leftPoleFallback, true);

    nodes.rightPoleFallback.clear();
    nodes.rightPoleFallback.roundRect(rightPoleX, poleTopY + 10, 16, 170, 6).fill(0xffffff);
    visibleDisplay(nodes.rightPoleFallback, true);
  }

  function createWarningNode() {
    const group = new PIXIRef.Container();
    group.visible = false;

    const fill = new PIXIRef.Graphics();
    fill.roundRect(
      -WARNING_BADGE_BASE_W * 0.5,
      -WARNING_BADGE_BASE_H * 0.5,
      WARNING_BADGE_BASE_W,
      WARNING_BADGE_BASE_H,
      WARNING_BADGE_RADIUS
    ).fill({ color: 0xffbf00, alpha: 0.94 });
    group.addChild(fill);

    const stroke = new PIXIRef.Graphics();
    stroke.roundRect(
      -WARNING_BADGE_BASE_W * 0.5,
      -WARNING_BADGE_BASE_H * 0.5,
      WARNING_BADGE_BASE_W,
      WARNING_BADGE_BASE_H,
      WARNING_BADGE_RADIUS
    ).stroke({ color: 0xea7b0a, width: 4 });
    group.addChild(stroke);

    const text = new PIXIRef.Text({ text: "AVOID!", style: WARNING_TEXT_STYLE });
    setAnchorIfAvailable(text, 0.5, 0.5);
    text.y = 4;
    group.addChild(text);

    layers.warnings.addChild(group);

    return {
      group,
      text
    };
  }

  function hideWarningNode(node) {
    hideDisplay(node?.group);
  }

  function syncWarningsLayer(sceneState, elapsedSeconds) {
    const warnings = sceneState?.warningLabels || [];
    beginPoolFrame(warningPool);

    for (const warning of warnings) {
      const node = acquirePoolNode(warningPool, warning.id, createWarningNode);
      const pulse = 1 + Math.sin(elapsedSeconds * 3 + warning.pulseSeed) * 0.1;
      node.group.x = warning.x + 34;
      node.group.y = warning.y - 8;
      node.group.scale.set(pulse, pulse);
      visibleDisplay(node.group, true);
    }

    releasePoolUnused(warningPool, hideWarningNode);
  }

  function ensureComboNode(index) {
    if (comboPool.nodes[index]) {
      return comboPool.nodes[index];
    }

    const group = new PIXIRef.Container();
    group.visible = false;

    const shadow = new PIXIRef.Text({ text: "", style: COMBO_SHADOW_STYLE });
    setAnchorIfAvailable(shadow, 0.5, 0.5);
    shadow.y = 0;
    group.addChild(shadow);

    const front = new PIXIRef.Text({ text: "", style: COMBO_FRONT_STYLE });
    setAnchorIfAvailable(front, 0.5, 0.5);
    front.y = -2;
    group.addChild(front);

    layers.comboPopups.addChild(group);

    const node = {
      group,
      shadow,
      front,
      lastText: "",
      lastFontSize: COMBO_BASE_FONT_SIZE,
      lastColor: 0xffffff
    };

    comboPool.nodes[index] = node;
    return node;
  }

  function syncComboPopupsLayer(sceneState) {
    const popups = sceneState?.comboPopups || [];

    for (let i = 0; i < popups.length; i += 1) {
      const popup = popups[i];
      const node = ensureComboNode(i);

      if (!popup?.text || popup.alpha <= 0) {
        hideDisplay(node.group);
        continue;
      }

      const nextText = popup.text;
      const nextFontSize = popup.fontSize || COMBO_BASE_FONT_SIZE;
      const nextColor = popup.color ?? 0xffffff;

      if (node.lastText !== nextText) {
        node.shadow.text = nextText;
        node.front.text = nextText;
        node.lastText = nextText;
      }

      if (node.lastFontSize !== nextFontSize) {
        node.shadow.style = {
          ...COMBO_SHADOW_STYLE,
          fontSize: nextFontSize
        };
        node.front.style = {
          ...COMBO_FRONT_STYLE,
          fontSize: nextFontSize,
          fill: nextColor
        };
        node.lastFontSize = nextFontSize;
        node.lastColor = nextColor;
      }

      if (node.lastFontSize === nextFontSize && node.lastColor !== nextColor) {
        node.front.style = {
          ...COMBO_FRONT_STYLE,
          fontSize: nextFontSize,
          fill: nextColor
        };
        node.lastColor = nextColor;
      }

      node.group.x = popup.x;
      node.group.y = popup.y;
      node.group.alpha = popup.alpha;
      node.group.scale.set(popup.scale || 1);
      node.group.rotation = popup.rotation || 0;
      visibleDisplay(node.group, true);
    }

    for (let i = popups.length; i < comboPool.nodes.length; i += 1) {
      hideDisplay(comboPool.nodes[i]?.group);
    }
  }

  function ensureConfettiSprite(index) {
    if (confettiPool.sprites[index]) {
      return confettiPool.sprites[index];
    }

    const sprite = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    sprite.visible = false;
    setAnchorIfAvailable(sprite, 0.5, 0.5);
    layers.fx.addChild(sprite);
    confettiPool.sprites[index] = sprite;
    return sprite;
  }

  function syncFxLayer(sceneState) {
    const particles = sceneState?.confettiParticles || [];

    let visibleCount = 0;
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.image || particle.alpha <= 0) {
        continue;
      }

      const texture = textureForImage(PIXIRef, textureCache, particle.image);
      if (!texture) {
        continue;
      }

      const sprite = ensureConfettiSprite(visibleCount);
      visibleCount += 1;
      sprite.texture = texture;
      sprite.x = particle.x;
      sprite.y = particle.y;
      sprite.rotation = particle.rotation;
      sprite.scale.set(particle.scale, particle.scale);
      sprite.alpha = particle.alpha;
      visibleDisplay(sprite, true);
    }

    for (let i = visibleCount; i < confettiPool.sprites.length; i += 1) {
      hideDisplay(confettiPool.sprites[i]);
    }
  }

  function ensureTutorialLayer() {
    if (tutorialState.container) {
      return tutorialState;
    }

    const container = new PIXIRef.Container();
    container.visible = false;

    const shadowText = new PIXIRef.Text({ text: "Jump to avoid enemies", style: TUTORIAL_SHADOW_STYLE });
    setAnchorIfAvailable(shadowText, 0.5, 0.5);
    container.addChild(shadowText);

    const frontText = new PIXIRef.Text({ text: "Jump to avoid enemies", style: TUTORIAL_FRONT_STYLE });
    setAnchorIfAvailable(frontText, 0.5, 0.5);
    frontText.y = -2;
    container.addChild(frontText);

    const hand = new PIXIRef.Sprite(PIXIRef.Texture.WHITE);
    setAnchorIfAvailable(hand, 0.5, 0.7);
    hand.visible = false;
    container.addChild(hand);

    layers.tutorialHint.addChild(container);

    tutorialState.container = container;
    tutorialState.shadowText = shadowText;
    tutorialState.frontText = frontText;
    tutorialState.hand = hand;

    return tutorialState;
  }

  function syncTutorialHintLayer(sceneState, elapsedSeconds, worldWidth, worldHeight, layoutState = null) {
    const nodes = ensureTutorialLayer();

    if (sceneState?.mode !== STATES.paused) {
      hideDisplay(nodes.container);
      return;
    }

    const hintY = hasNumber(layoutState?.gameplayTokens?.tutorialTextY)
      ? layoutState.gameplayTokens.tutorialTextY
      : worldHeight * 0.58;

    const centerX = worldWidth * 0.5;
    nodes.shadowText.x = centerX;
    nodes.shadowText.y = hintY;
    nodes.frontText.x = centerX;
    nodes.frontText.y = hintY - 2;

    const handTexture = textureForImage(PIXIRef, textureCache, sceneState.resources?.images?.tutorialHand);
    if (handTexture) {
      const handWidth = 150;
      const handHeight = 150;
      const handY = hintY + 34;
      const anchorX = centerX;
      const anchorY = handY + handHeight * 0.7;
      const scale = tutorialHandPulseScale(elapsedSeconds);
      nodes.hand.texture = handTexture;
      nodes.hand.x = anchorX;
      nodes.hand.y = anchorY;
      nodes.hand.scale.set((handWidth / handTexture.width) * scale, (handHeight / handTexture.height) * scale);
      visibleDisplay(nodes.hand, true);
    } else {
      hideDisplay(nodes.hand);
    }

    visibleDisplay(nodes.container, true);
  }

  function forceTextRasterization(textNode) {
    if (!textNode) {
      return;
    }

    try {
      if (typeof textNode.updateText === "function") {
        textNode.updateText(true);
        return;
      }
      if (typeof textNode.validate === "function") {
        textNode.validate();
      }
    } catch {
      // Best-effort warmup only.
    }
  }

  function prewarmFrameTextures(baseTexture, frames) {
    if (!baseTexture || !Array.isArray(frames) || frames.length === 0) {
      return;
    }

    for (const frame of frames) {
      frameTextureForSheet(PIXIRef, frameTextureCache, baseTexture, frame);
    }
  }

  function seedPool(pool, factory, hideFn, minCount = 1) {
    const total = pool.active.size + pool.free.length;
    for (let i = total; i < minCount; i += 1) {
      const node = factory();
      hideFn?.(node);
      pool.free.push(node);
    }
  }

  function prewarmRendererResources(frame = null) {
    if (prewarmed || !initialized || !PIXIRef || !layers) {
      return;
    }

    const sceneState = frame?.state || frame || null;
    const images = sceneState?.resources?.images;
    if (!images) {
      return;
    }

    // Warm common textures that otherwise get created on the first enemy/tutorial frame.
    const imageCandidates = [
      images.sceneBackground,
      images.sceneTreeLeft,
      images.sceneTreeRight,
      images.sceneBushLarge,
      images.sceneBushMedium,
      images.sceneBushSmall,
      images.sceneLamp,
      images.playerSheet,
      images.enemySheet,
      images.collectibleIcon,
      images.paypalCardCollectible,
      images.paypalCard,
      images.obstacleSprite,
      images.obstacleGlow,
      images.finishFloorPattern,
      images.finishPoleLeft,
      images.finishPoleRight,
      images.finishTapeLeft,
      images.finishTapeRight,
      images.tutorialHand
    ];

    const warmupTextures = new Set();
    for (const image of imageCandidates) {
      const texture = textureForImage(PIXIRef, textureCache, image);
      if (texture) {
        warmupTextures.add(texture);
      }
    }

    const playerBaseTexture = textureForImage(PIXIRef, textureCache, images.playerSheet);
    const enemyBaseTexture = textureForImage(PIXIRef, textureCache, images.enemySheet);
    prewarmFrameTextures(playerBaseTexture, ASSET_FRAMES.playerIdle);
    prewarmFrameTextures(playerBaseTexture, ASSET_FRAMES.playerRun);
    prewarmFrameTextures(playerBaseTexture, ASSET_FRAMES.playerJump);
    prewarmFrameTextures(enemyBaseTexture, ASSET_FRAMES.enemyRun);
    const firstPlayerFrame = (ASSET_FRAMES.playerRun || [])[0] || (ASSET_FRAMES.playerIdle || [])[0] || null;
    const firstEnemyFrame = (ASSET_FRAMES.enemyRun || [])[0] || null;
    const firstPlayerFrameTexture = frameTextureForSheet(
      PIXIRef,
      frameTextureCache,
      playerBaseTexture,
      firstPlayerFrame
    );
    const firstEnemyFrameTexture = frameTextureForSheet(
      PIXIRef,
      frameTextureCache,
      enemyBaseTexture,
      firstEnemyFrame
    );
    if (firstPlayerFrameTexture) {
      warmupTextures.add(firstPlayerFrameTexture);
    }
    if (firstEnemyFrameTexture) {
      warmupTextures.add(firstEnemyFrameTexture);
    }

    const tutorialNodes = ensureTutorialLayer();
    const comboNode = ensureComboNode(0);
    ensurePlayerNodes();
    ensureFinishNodes();

    seedPool(enemyPool, createEnemyNode, hideEnemyNode, 1);
    seedPool(obstaclePool, createObstacleNode, hideObstacleNode, 1);
    seedPool(collectiblePool, createCollectibleNode, hideCollectibleNode, 1);
    seedPool(warningPool, createWarningNode, hideWarningNode, 1);

    forceTextRasterization(tutorialNodes.shadowText);
    forceTextRasterization(tutorialNodes.frontText);
    forceTextRasterization(comboNode.shadow);
    forceTextRasterization(comboNode.front);
    const seededWarning = warningPool.free[0] || null;
    forceTextRasterization(seededWarning?.text);

    if (tutorialNodes.hand && images.tutorialHand) {
      const handTexture = textureForImage(PIXIRef, textureCache, images.tutorialHand);
      if (handTexture) {
        tutorialNodes.hand.texture = handTexture;
        warmupTextures.add(handTexture);
      }
    }

    // Force one hidden draw pass so textures are uploaded to GPU before gameplay.
    const gpuWarmupLayer = new PIXIRef.Container();
    gpuWarmupLayer.alpha = 0.01;
    gpuWarmupLayer.visible = true;
    gpuWarmupLayer.eventMode = "none";
    app.stage.addChild(gpuWarmupLayer);
    let warmupIndex = 0;
    for (const texture of warmupTextures) {
      const sample = new PIXIRef.Sprite(texture);
      sample.x = (warmupIndex % 10) * 2;
      sample.y = Math.floor(warmupIndex / 10) * 2;
      sample.scale.set(
        Math.max(0.02, 2 / Math.max(1, texture.width || 1)),
        Math.max(0.02, 2 / Math.max(1, texture.height || 1))
      );
      gpuWarmupLayer.addChild(sample);
      warmupIndex += 1;
    }

    resetPoolsVisibility();

    try {
      app.render();
    } catch {
      // Best-effort warmup only.
    }
    app.stage.removeChild(gpuWarmupLayer);
    gpuWarmupLayer.destroy({ children: true });

    prewarmed = true;
  }

  function resetPoolsVisibility() {
    for (const sprite of skyState.sprites) {
      hideDisplay(sprite);
    }
    hideDisplay(skyState.fallbackRect);

    for (const sprite of decorState.sprites) {
      hideDisplay(sprite);
    }

    hideDisplay(groundFallbackState.container);

    for (const pool of [enemyPool, obstaclePool, collectiblePool, warningPool]) {
      for (const node of pool.active.values()) {
        hideDisplay(node?.container || node?.group || node);
      }
      for (const node of pool.free) {
        hideDisplay(node?.container || node?.group || node);
      }
    }

    for (const node of comboPool.nodes) {
      hideDisplay(node?.group);
    }

    for (const sprite of confettiPool.sprites) {
      hideDisplay(sprite);
    }

    if (finishState.floor) {
      hideDisplay(finishState.floor);
      hideDisplay(finishState.leftPole);
      hideDisplay(finishState.rightPole);
      hideDisplay(finishState.leftTape);
      hideDisplay(finishState.rightTape);
      hideDisplay(finishState.leftPoleFallback);
      hideDisplay(finishState.rightPoleFallback);
    }

    if (playerState.sprite) {
      hideDisplay(playerState.sprite);
      hideDisplay(playerState.flash);
      hideDisplay(playerState.fallback);
    }

    hideDisplay(tutorialState.container);
  }

  return {
    backend: "pixi",
    async init() {
      if (initialized || unavailable) {
        return;
      }

      if (!canvas) {
        unavailable = true;
        warnUnavailableOnce("host canvas not provided");
        onUnavailable?.();
        return;
      }

      try {
        const PIXI = await getPixiGlobal();
        PIXIRef = PIXI;
        app = new PIXI.Application();
        await app.init({
          width,
          height,
          backgroundAlpha: 0,
          antialias: false,
          autoStart: false,
          sharedTicker: false,
          powerPreference: "high-performance"
        });

        pixiCanvas = app.canvas;
        pixiCanvas.dataset.renderer = "pixi";
        pixiCanvas.style.position = "absolute";
        pixiCanvas.style.display = "block";
        pixiCanvas.style.zIndex = "0";
        pixiCanvas.style.pointerEvents = "none";
        pixiCanvas.style.background = "transparent";
        applyViewportStylesToPixiCanvas();

        originalCanvasInlineOpacity = canvas.style.opacity;
        originalCanvasInlineBackground = canvas.style.background;
        originalCanvasInlinePosition = canvas.style.position;
        originalCanvasInlineZIndex = canvas.style.zIndex;

        canvas.style.opacity = "0";
        canvas.style.background = "transparent";
        canvas.style.position = "";
        canvas.style.zIndex = "1";

        canvas.parentNode?.insertBefore(pixiCanvas, canvas);

        layers = buildLayerContainers(PIXI, app.stage);
        syncRendererResolution();

        initialized = true;
      } catch (error) {
        unavailable = true;
        warnUnavailableOnce(error instanceof Error ? error.message : "unknown error");
        onUnavailable?.();
        if (pixiCanvas && pixiCanvas.parentNode) {
          pixiCanvas.parentNode.removeChild(pixiCanvas);
        }
        pixiCanvas = null;
        if (app) {
          try {
            app.destroy(true, { children: true });
          } catch {
            // Best-effort cleanup only.
          }
        }
        app = null;
        restoreCanvasInputLayer();
      }
    },
    render(frame) {
      if (!initialized || !app || !PIXIRef || !layers) {
        return;
      }

      const sceneState = frame?.state || null;
      if (!prewarmed && sceneState?.resources?.images) {
        prewarmRendererResources(frame);
      }
      const worldMetrics = resolveFrameWorldMetrics(frame);
      const groundY = worldMetrics.groundY;

      syncWorldRootTransform(frame);

      syncSkyLayer(sceneState, worldMetrics.worldWidth, groundY, worldMetrics.worldHeight);
      syncDecorLayer(sceneState, worldMetrics.worldWidth, groundY);
      syncGroundLayer(sceneState, worldMetrics.worldWidth, groundY, worldMetrics.worldHeight);

      const elapsedSeconds = frame?.elapsedSeconds ?? 0;
      syncCollectiblesLayer(sceneState, elapsedSeconds);
      syncObstaclesLayer(sceneState, elapsedSeconds);
      syncFinishLayer(sceneState, groundY);
      syncEnemyLayer(sceneState, elapsedSeconds);
      syncWarningsLayer(sceneState, elapsedSeconds);
      syncPlayerLayer(sceneState);
      syncFxLayer(sceneState);
      syncComboPopupsLayer(sceneState);
      syncTutorialHintLayer(
        sceneState,
        elapsedSeconds,
        worldMetrics.worldWidth,
        worldMetrics.worldHeight,
        frame?.layoutState || null
      );

      app.render();
    },
    resize(viewportState) {
      if (!initialized) {
        return;
      }

      applyViewportStylesToPixiCanvas();
      syncRendererResolution(viewportState);
    },
    prewarm(frame = null) {
      if (!initialized) {
        return;
      }

      prewarmRendererResources(frame);
    },
    destroy() {
      resetPoolsVisibility();

      if (pixiCanvas && pixiCanvas.parentNode) {
        pixiCanvas.parentNode.removeChild(pixiCanvas);
      }
      pixiCanvas = null;
      if (app) {
        app.destroy(true, { children: true });
      }
      app = null;
      PIXIRef = null;
      layers = null;
      frameTextureCache.clear();
      initialized = false;
      lastAppliedPixelRatio = null;
      prewarmed = false;
      restoreCanvasInputLayer();
    },
    getLayers() {
      return layers;
    }
  };
}
