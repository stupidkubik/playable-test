import { STATES, computeFinishGateGeometry } from "../gameLogic.js";
import { ASSETS } from "../assets/playableAssets.js";

let pixiGlobalPromise = null;
const PIXI_CDN_SRC = "https://cdn.jsdelivr.net/npm/pixi.js@8.16.0/dist/pixi.min.js";

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
        {
          once: true
        }
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
      {
        once: true
      }
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
      // Allow a new attempt later (e.g. temporary network error or script path issue fixed).
      pixiGlobalPromise = null;
      throw error;
    });
  }

  return pixiGlobalPromise;
}

function buildLayerContainers(PIXI, stage) {
  const names = [
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
  ];
  const layers = Object.create(null);
  const worldRoot = new PIXI.Container();
  worldRoot.label = "layer-root:world";
  layers.worldRoot = worldRoot;
  stage.addChild(worldRoot);

  for (const name of names) {
    const container = new PIXI.Container();
    container.label = `layer:${name}`;
    layers[name] = container;
    worldRoot.addChild(container);
  }

  return layers;
}

function drawPlaceholderBackground(PIXI, layers, width, height) {
  const sky = new PIXI.Graphics();
  sky.rect(0, 0, width, height * 0.66).fill(0x8dc3ea);
  layers.sky.addChild(sky);

  const ground = new PIXI.Graphics();
  ground.rect(0, height * 0.66, width, height * 0.34).fill(0x2b4255);
  layers.ground.addChild(ground);

  const stripe = new PIXI.Graphics();
  stripe.rect(0, height * 0.66 + 40, width, 10).fill(0x3a566b);
  layers.ground.addChild(stripe);
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

function clearContainer(container) {
  if (!container) {
    return;
  }

  const children = container.removeChildren();
  for (const child of children) {
    child.destroy?.();
  }
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
  const idleFrames = ASSETS.frames.playerIdle || ASSETS.frames.playerRun;
  const runFrames = ASSETS.frames.playerRun;
  const jumpFrames = ASSETS.frames.playerJump;
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

function setAnchorIfAvailable(displayObject, x, y = x) {
  if (displayObject?.anchor?.set) {
    displayObject.anchor.set(x, y);
  }
}

function addTextLabel(PIXI, container, text, x, y, style, anchorX = 0, anchorY = 0) {
  const label = new PIXI.Text({ text, style });
  label.x = x;
  label.y = y;
  setAnchorIfAvailable(label, anchorX, anchorY);
  container.addChild(label);
  return label;
}

function tutorialHandPulseScale(elapsedSeconds) {
  const cycleSeconds = 1.1;
  const phase = (elapsedSeconds % cycleSeconds) / cycleSeconds;
  return 0.97 - 0.09 * Math.cos(phase * Math.PI * 2);
}

function syncSkyLayer(PIXI, textureCache, layers, sceneState, width, groundY, height) {
  clearContainer(layers.sky);

  const scene = sceneState?.resources?.images?.sceneBackground;
  const sceneTexture = textureForImage(PIXI, textureCache, scene);

  if (!sceneTexture || !scene?.height) {
    const sky = new PIXI.Graphics();
    sky.rect(0, 0, width, groundY).fill(0x8dc3ea);
    layers.sky.addChild(sky);
    return;
  }

  // In Pixi mode the host canvas is transparent (input-layer only), so the scene background
  // must cover the full render surface instead of relying on CSS background under the canvas.
  const scale = height / scene.height;
  const drawWidth = scene.width * scale;
  const baseTileIndexStart = Math.floor(sceneState.skyOffset / drawWidth);
  const wrappedOffset = ((sceneState.skyOffset % drawWidth) + drawWidth) % drawWidth;
  // Start one tile earlier so wide layouts with centered capped camera still have
  // a mirrored background on the negative side (left margin).
  const tileIndexStart = baseTileIndexStart - 1;
  const tileStartX = -wrappedOffset - drawWidth;
  const tileCount = Math.ceil(width / drawWidth) + 3;

  for (let i = 0; i < tileCount; i += 1) {
    const tileIndex = tileIndexStart + i;
    const tileX = tileStartX + i * drawWidth;
    const mirrored = tileIndex % 2 !== 0;
    const sprite = new PIXI.Sprite(sceneTexture);
    sprite.x = mirrored ? tileX + drawWidth : tileX;
    sprite.y = 0;
    sprite.scale.set(mirrored ? -scale : scale, scale);
    layers.sky.addChild(sprite);
  }
}

function syncGroundLayer(PIXI, layers, sceneState, width, groundY, height) {
  clearContainer(layers.ground);

  if (sceneState?.resources?.images?.sceneBackground) {
    return;
  }

  const ground = new PIXI.Graphics();
  ground.rect(0, groundY, width, height - groundY).fill(0x1f2f3e);
  layers.ground.addChild(ground);

  const offset = sceneState?.groundOffset || 0;
  for (let i = -1; i < width / 56 + 2; i += 1) {
    const x = i * 56 - (offset % 56);
    const stripe = new PIXI.Graphics();
    stripe.rect(x, groundY + 42, 34, 11).fill(0x283f52);
    layers.ground.addChild(stripe);
  }
}

function syncDecorLayer(
  PIXI,
  textureCache,
  layers,
  sceneState,
  visibleWorldWidth,
  groundY,
  decorLayoutBaseWidth = 720
) {
  clearContainer(layers.decor);

  const images = sceneState?.resources?.images;
  const scene = images?.sceneBackground;
  if (!scene || !scene.height) {
    return;
  }

  const treeLeft = textureForImage(PIXI, textureCache, images.sceneTreeLeft);
  const treeRight = textureForImage(PIXI, textureCache, images.sceneTreeRight);
  const bushLarge = textureForImage(PIXI, textureCache, images.sceneBushLarge);
  const bushMediumImage = images.sceneBushMedium;
  const bushMedium = textureForImage(PIXI, textureCache, bushMediumImage);
  const bushSmall = textureForImage(PIXI, textureCache, images.sceneBushSmall);
  const lamp = textureForImage(PIXI, textureCache, images.sceneLamp);

  const sceneScale = groundY / scene.height;
  const sceneDrawWidth = scene.width * sceneScale;
  const tileIndexStart = Math.floor(sceneState.skyOffset / sceneDrawWidth);
  const wrappedOffset = ((sceneState.skyOffset % sceneDrawWidth) + sceneDrawWidth) % sceneDrawWidth;
  const tileStartX = -wrappedOffset;
  const tileCount = Math.ceil(visibleWorldWidth / sceneDrawWidth) + 2;

  function addSprite(texture, x, y, w, h, mirrored, tileX) {
    if (!texture) {
      return;
    }
    const sprite = new PIXI.Sprite(texture);
    if (mirrored) {
      sprite.x = tileX + (sceneDrawWidth - x);
      sprite.y = y;
      sprite.scale.set(-(w / texture.width), h / texture.height);
    } else {
      sprite.x = tileX + x;
      sprite.y = y;
      sprite.scale.set(w / texture.width, h / texture.height);
    }
    layers.decor.addChild(sprite);
  }

  for (let i = 0; i < tileCount; i += 1) {
    const tileIndex = tileIndexStart + i;
    const tileX = tileStartX + i * sceneDrawWidth;
    const mirrored = tileIndex % 2 !== 0;

    // Keep decorative composition anchored to the original design width.
    // The camera can reveal more tiles on wide screens, but the layout within each tile
    // should not drift with the visible viewport width.
    addSprite(treeLeft, decorLayoutBaseWidth - 1100, -40, 1000, 740, mirrored, tileX);
    addSprite(treeLeft, decorLayoutBaseWidth - 600, -40, 1000, 740, mirrored, tileX);
    addSprite(lamp, decorLayoutBaseWidth - 400, 0, 200, 700, mirrored, tileX);
    addSprite(bushSmall, decorLayoutBaseWidth - 600, 535, 165, 165, mirrored, tileX);
    addSprite(bushLarge, decorLayoutBaseWidth - 450, 530, 220, 180, mirrored, tileX);
    addSprite(treeLeft, decorLayoutBaseWidth, -40, 1000, 740, mirrored, tileX);
    addSprite(bushMedium, decorLayoutBaseWidth + 40, 530, 148, 176, mirrored, tileX);
    addSprite(lamp, decorLayoutBaseWidth + 200, 0, 200, 700, mirrored, tileX);
    addSprite(treeRight, decorLayoutBaseWidth + 400, -40, 1000, 740, mirrored, tileX);
    addSprite(bushLarge, decorLayoutBaseWidth + 300, 530, 220, 180, mirrored, tileX);
    addSprite(bushMedium, decorLayoutBaseWidth + 560, 530, 148, 172, mirrored, tileX);
    addSprite(bushSmall, decorLayoutBaseWidth + 900, 535, 165, 165, mirrored, tileX);
    addSprite(lamp, decorLayoutBaseWidth + 1200, 0, 200, 700, mirrored, tileX);
    addSprite(bushLarge, decorLayoutBaseWidth + 1400, 530, 220, 180, mirrored, tileX);
  }
}

function syncPlayerLayer(PIXI, textureCache, frameTextureCache, layers, sceneState) {
  clearContainer(layers.player);

  const player = sceneState?.player;
  if (!player) {
    return;
  }

  const spriteSheetImage = sceneState.resources?.images?.playerSheet;
  const baseTexture = textureForImage(PIXI, textureCache, spriteSheetImage);
  const frame = currentPlayerFrame(sceneState);

  if (!baseTexture || !frame) {
    const fallback = new PIXI.Graphics();
    fallback.rect(player.x, player.y, player.width, player.height).fill(0xf2664b);
    layers.player.addChild(fallback);
    return;
  }

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
  const frameTexture = frameTextureForSheet(PIXI, frameTextureCache, baseTexture, frame);

  if (!frameTexture) {
    return;
  }

  const sprite = new PIXI.Sprite(frameTexture);
  sprite.x = drawX;
  sprite.y = drawY;
  sprite.scale.set(drawWidth / frame.w, drawHeight / frame.h);
  layers.player.addChild(sprite);

  const damageFlashActive = player.invincibilityMs > 0 && !player.blinkVisible;
  if (damageFlashActive) {
    const flash = new PIXI.Sprite(frameTexture);
    flash.x = drawX;
    flash.y = drawY;
    flash.scale.set(drawWidth / frame.w, drawHeight / frame.h);
    flash.tint = 0xff3a3a;
    flash.alpha = 0.62;
    layers.player.addChild(flash);
  }
}

function syncEnemyLayer(PIXI, textureCache, frameTextureCache, layers, sceneState, elapsedSeconds) {
  clearContainer(layers.enemies);

  const enemies = sceneState?.enemies || [];
  if (enemies.length === 0) {
    return;
  }

  const spriteSheetImage = sceneState.resources?.images?.enemySheet;
  const baseTexture = textureForImage(PIXI, textureCache, spriteSheetImage);
  const sequence = ASSETS.frames.enemyRun || [];
  const frozenTick = sceneState.frozenEnemyAnimationTick;
  const freezeEnemyAnimation = sceneState.mode === STATES.paused || sceneState.mode === STATES.endLose;
  const fallbackFrozenTick = Number.isFinite(frozenTick) ? frozenTick : 0;
  const useFrozenTick = freezeEnemyAnimation;

  for (const enemy of enemies) {
    if (!baseTexture || sequence.length === 0) {
      const fallback = new PIXI.Graphics();
      fallback.rect(enemy.x, enemy.y, enemy.width, enemy.height).fill(0x263947);
      layers.enemies.addChild(fallback);
      continue;
    }

    const frameTick = useFrozenTick ? fallbackFrozenTick : Math.floor(elapsedSeconds * 10);
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
    const frameTexture = frameTextureForSheet(PIXI, frameTextureCache, baseTexture, frame);

    if (!frameTexture) {
      continue;
    }

    const sprite = new PIXI.Sprite(frameTexture);
    sprite.x = drawX + drawWidth;
    sprite.y = drawY;
    sprite.scale.set(-(drawWidth / frame.w), drawHeight / frame.h);
    layers.enemies.addChild(sprite);
  }
}

function syncObstaclesLayer(PIXI, textureCache, layers, sceneState, elapsedSeconds) {
  clearContainer(layers.obstacles);

  const obstacles = sceneState?.obstacles || [];
  if (obstacles.length === 0) {
    return;
  }

  const obstacleSpriteTexture = textureForImage(PIXI, textureCache, sceneState.resources?.images?.obstacleSprite);
  const obstacleGlowTexture = textureForImage(PIXI, textureCache, sceneState.resources?.images?.obstacleGlow);
  const obstacleAnimSeconds = sceneState?.mode === STATES.endLose ? 0 : elapsedSeconds;

  for (const obstacle of obstacles) {
    if (obstacleGlowTexture) {
      const pulse = 1 + Math.sin(obstacleAnimSeconds * 3 + obstacle.pulseSeed) * 0.1;
      const glowWidth = obstacle.width * pulse;
      const glowHeight = obstacle.height * pulse;
      const glowX = obstacle.x - (glowWidth - obstacle.width) * 0.5;
      const glowY = obstacle.y - (glowHeight - obstacle.height);
      const glow = new PIXI.Sprite(obstacleGlowTexture);
      glow.x = glowX;
      glow.y = glowY;
      glow.scale.set(glowWidth / obstacleGlowTexture.width, glowHeight / obstacleGlowTexture.height);
      glow.alpha = 0.85;
      layers.obstacles.addChild(glow);
    }

    if (obstacleSpriteTexture) {
      const sprite = new PIXI.Sprite(obstacleSpriteTexture);
      sprite.x = obstacle.x;
      sprite.y = obstacle.y;
      sprite.scale.set(obstacle.width / obstacleSpriteTexture.width, obstacle.height / obstacleSpriteTexture.height);
      layers.obstacles.addChild(sprite);
      continue;
    }

    const pulse = 1 + Math.sin(obstacleAnimSeconds * 4 + obstacle.pulseSeed) * 0.05;
    const width = obstacle.width * pulse;
    const height = obstacle.height * pulse;
    const x = obstacle.x - (width - obstacle.width) * 0.5;
    const y = obstacle.y - (height - obstacle.height);
    const fallback = new PIXI.Graphics();
    fallback.roundRect(x, y, width, height, 14).fill({ color: 0xffc840, alpha: 0.32 });
    layers.obstacles.addChild(fallback);
  }
}

function syncCollectiblesLayer(PIXI, textureCache, layers, sceneState, elapsedSeconds) {
  clearContainer(layers.collectibles);

  const collectibles = sceneState?.collectibles || [];
  if (collectibles.length === 0) {
    return;
  }

  const iconTexture = textureForImage(PIXI, textureCache, sceneState.resources?.images?.collectibleIcon);
  const paypalTexture = textureForImage(
    PIXI,
    textureCache,
    sceneState.resources?.images?.paypalCardCollectible || sceneState.resources?.images?.paypalCard
  );

  for (const collectible of collectibles) {
    const bob = Math.sin(elapsedSeconds * 4 + collectible.bobSeed) * 10;
    const y = collectible.y + bob;

    if (collectible.collectibleType === "paypalCard") {
      if (paypalTexture) {
        const sprite = new PIXI.Sprite(paypalTexture);
        sprite.x = collectible.x;
        sprite.y = y;
        sprite.scale.set(
          collectible.width / paypalTexture.width,
          collectible.height / paypalTexture.height
        );
        layers.collectibles.addChild(sprite);
        continue;
      }

      const fallbackCard = new PIXI.Graphics();
      fallbackCard.roundRect(collectible.x, y, collectible.width, collectible.height * 0.68, 10).fill(0x1756c6);
      layers.collectibles.addChild(fallbackCard);
      continue;
    }

    if (iconTexture) {
      const sprite = new PIXI.Sprite(iconTexture);
      sprite.x = collectible.x;
      sprite.y = y;
      sprite.scale.set(collectible.width / iconTexture.width, collectible.height / iconTexture.height);
      layers.collectibles.addChild(sprite);
      continue;
    }

    const fallbackCoin = new PIXI.Graphics();
    fallbackCoin.circle(
      collectible.x + collectible.width * 0.5,
      y + collectible.height * 0.5,
      collectible.width * 0.5
    ).fill(0xffe170);
    layers.collectibles.addChild(fallbackCoin);
  }
}

function syncFxLayer(PIXI, textureCache, layers, sceneState) {
  clearContainer(layers.fx);

  const particles = sceneState?.confettiParticles || [];
  if (particles.length === 0) {
    return;
  }

  for (const particle of particles) {
    if (!particle.image || particle.alpha <= 0) {
      continue;
    }

    const texture = textureForImage(PIXI, textureCache, particle.image);
    if (!texture) {
      continue;
    }

    const sprite = new PIXI.Sprite(texture);
    sprite.x = particle.x;
    sprite.y = particle.y;
    sprite.rotation = particle.rotation;
    setAnchorIfAvailable(sprite, 0.5, 0.5);
    sprite.scale.set(particle.scale, particle.scale);
    sprite.alpha = particle.alpha;
    layers.fx.addChild(sprite);
  }
}

function syncComboPopupsLayer(PIXI, layers, sceneState) {
  clearContainer(layers.comboPopups);

  const popups = sceneState?.comboPopups || [];
  if (popups.length === 0) {
    return;
  }

  for (const popup of popups) {
    if (!popup?.text || popup.alpha <= 0) {
      continue;
    }

    const group = new PIXI.Container();
    group.x = popup.x;
    group.y = popup.y;
    group.alpha = popup.alpha;
    group.scale.set(popup.scale || 1);
    group.rotation = popup.rotation || 0;
    layers.comboPopups.addChild(group);

    addTextLabel(
      PIXI,
      group,
      popup.text,
      0,
      0,
      {
        fontFamily: "GameFont",
        fontSize: popup.fontSize || 56,
        fontWeight: "800",
        fill: 0x000000,
        align: "center"
      },
      0.5,
      0.5
    );
    addTextLabel(
      PIXI,
      group,
      popup.text,
      0,
      -2,
      {
        fontFamily: "GameFont",
        fontSize: popup.fontSize || 56,
        fontWeight: "800",
        fill: popup.color ?? 0xffffff,
        align: "center"
      },
      0.5,
      0.5
    );
  }
}

function addScaledSprite(container, PIXI, texture, x, y, width, height) {
  if (!texture) {
    return null;
  }
  const sprite = new PIXI.Sprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.scale.set(width / texture.width, height / texture.height);
  container.addChild(sprite);
  return sprite;
}

function addRotatedScaledSprite(container, PIXI, texture, x, y, width, height, rotation, anchorX = 0.5, anchorY = 0.5) {
  if (!texture) {
    return null;
  }
  const sprite = new PIXI.Sprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.rotation = rotation;
  setAnchorIfAvailable(sprite, anchorX, anchorY);
  sprite.scale.set(width / texture.width, height / texture.height);
  container.addChild(sprite);
  return sprite;
}

function addRotatedScaledSkewedSprite(
  container,
  PIXI,
  texture,
  x,
  y,
  width,
  height,
  rotation,
  anchorX = 0.5,
  anchorY = 0.5,
  skewX = 0,
  skewY = 0
) {
  const sprite = addRotatedScaledSprite(
    container,
    PIXI,
    texture,
    x,
    y,
    width,
    height,
    rotation,
    anchorX,
    anchorY
  );
  if (sprite?.skew?.set) {
    sprite.skew.set(skewX, skewY);
  }
  return sprite;
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

function syncFinishLayer(PIXI, textureCache, layers, sceneState, groundY) {
  clearContainer(layers.finish);

  const finish = sceneState?.finishLine;
  if (!finish) {
    return;
  }

  const images = sceneState.resources?.images || {};
  const floorPattern = textureForImage(PIXI, textureCache, images.finishFloorPattern);
  const leftPole = textureForImage(PIXI, textureCache, images.finishPoleLeft);
  const rightPole = textureForImage(PIXI, textureCache, images.finishPoleRight);
  const leftTape = textureForImage(PIXI, textureCache, images.finishTapeLeft);
  const rightTape = textureForImage(PIXI, textureCache, images.finishTapeRight);
  const finishGeometry = computeFinishGateGeometry(finish, groundY, images);

  const canUseSpriteFinish = floorPattern && leftPole && rightPole && leftTape && rightTape;

  if (canUseSpriteFinish && finishGeometry) {
    const floorSprite = finishGeometry.sprites.floor;
    const leftPoleSprite = finishGeometry.sprites.leftPole;
    const rightPoleSprite = finishGeometry.sprites.rightPole;
    const leftTapeSprite = finishGeometry.sprites.leftTape;
    const rightTapeSprite = finishGeometry.sprites.rightTape;
    const tapeBreakProgress = Number.isFinite(finish?.tapeBreakProgress)
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
    addScaledSprite(
      layers.finish,
      PIXI,
      floorPattern,
      floorSprite.x,
      floorSprite.y,
      floorSprite.width,
      floorSprite.height
    );
    addRotatedScaledSprite(
      layers.finish,
      PIXI,
      leftPole,
      leftPoleSprite.x,
      leftPoleSprite.y,
      leftPoleSprite.width,
      leftPoleSprite.height,
      leftPoleSprite.rotation,
      leftPoleSprite.anchorX,
      leftPoleSprite.anchorY
    );
    addRotatedScaledSprite(
      layers.finish,
      PIXI,
      rightPole,
      rightPoleSprite.x,
      rightPoleSprite.y,
      rightPoleSprite.width,
      rightPoleSprite.height,
      rightPoleSprite.rotation,
      rightPoleSprite.anchorX,
      rightPoleSprite.anchorY
    );
    addRotatedScaledSkewedSprite(
      layers.finish,
      PIXI,
      leftTape,
      leftTapeSprite.x,
      leftTapeSprite.y,
      leftTapeSprite.width,
      leftTapeSprite.height,
      leftTapeSprite.rotation,
      leftTapeSprite.anchorX,
      leftTapeSprite.anchorY,
      leftTapeSkewX,
      leftTapeSkewY
    );
    addRotatedScaledSkewedSprite(
      layers.finish,
      PIXI,
      rightTape,
      rightTapeSprite.x,
      rightTapeSprite.y,
      rightTapeSprite.width,
      rightTapeSprite.height,
      rightTapeSprite.rotation,
      rightTapeSprite.anchorX,
      rightTapeSprite.anchorY,
      rightTapeSkewX,
      rightTapeSkewY
    );
    return;
  }

  const leftPoleX = finish.x - 50;
  const rightPoleX = finish.x + 62;
  const poleTopY = finish.y;

  const leftPoleRect = new PIXI.Graphics();
  leftPoleRect.roundRect(leftPoleX, poleTopY - 10, 16, 190, 6).fill(0xffffff);
  layers.finish.addChild(leftPoleRect);

  const rightPoleRect = new PIXI.Graphics();
  rightPoleRect.roundRect(rightPoleX, poleTopY + 10, 16, 170, 6).fill(0xffffff);
  layers.finish.addChild(rightPoleRect);
}

function syncWarningsLayer(PIXI, layers, sceneState, elapsedSeconds) {
  clearContainer(layers.warnings);

  const warnings = sceneState?.warningLabels || [];
  for (const warning of warnings) {
    const badgeCenterX = warning.x + 34;
    const badgeCenterY = warning.y - 8;
    const pulse = 1 + Math.sin(elapsedSeconds * 8 + warning.pulseSeed) * 0.1;
    const w = 166 * pulse;
    const h = 52 * pulse;
    const x = badgeCenterX - w * 0.5;
    const y = badgeCenterY - h * 0.5;

    const fill = new PIXI.Graphics();
    fill.roundRect(x, y, w, h, 10).fill({ color: 0xffbf00, alpha: 0.94 });
    layers.warnings.addChild(fill);

    const stroke = new PIXI.Graphics();
    stroke.roundRect(x, y, w, h, 10).stroke({ color: 0xea7b0a, width: 4 });
    layers.warnings.addChild(stroke);

    addTextLabel(
      PIXI,
      layers.warnings,
      "AVOID!",
      badgeCenterX,
      badgeCenterY + 4,
      {
        fontFamily: "GameFont",
        fontSize: 28,
        fontWeight: "900",
        fill: 0xff1f16,
        align: "center"
      },
      0.5,
      0.5
    );
  }
}

function syncTutorialHintLayer(
  PIXI,
  textureCache,
  layers,
  sceneState,
  elapsedSeconds,
  width,
  height,
  layoutState = null
) {
  clearContainer(layers.tutorialHint);

  if (sceneState?.mode !== STATES.paused) {
    return;
  }

  const hintY = Number.isFinite(layoutState?.gameplayTokens?.tutorialTextY)
    ? layoutState.gameplayTokens.tutorialTextY
    : height * 0.58;

  addTextLabel(
    PIXI,
    layers.tutorialHint,
    "Jump to avoid enemies",
    width * 0.5,
    hintY,
    {
      fontFamily: "GameFont",
      fontSize: 60,
      fontWeight: "700",
      fill: 0x000000,
      align: "center"
    },
    0.5,
    0.5
  );
  addTextLabel(
    PIXI,
    layers.tutorialHint,
    "Jump to avoid enemies",
    width * 0.5,
    hintY - 2,
    {
      fontFamily: "GameFont",
      fontSize: 60,
      fontWeight: "700",
      fill: 0xffffff,
      align: "center"
    },
    0.5,
    0.5
  );

  const handTexture = textureForImage(PIXI, textureCache, sceneState.resources?.images?.tutorialHand);
  if (!handTexture) {
    return;
  }

  const handWidth = 150;
  const handHeight = 150;
  const handX = width * 0.5 - handWidth * 0.5;
  const handY = hintY + 34;
  const anchorX = handX + handWidth * 0.5;
  const anchorY = handY + handHeight * 0.7;
  const scale = tutorialHandPulseScale(elapsedSeconds);
  const hand = new PIXI.Sprite(handTexture);
  hand.x = anchorX;
  hand.y = anchorY;
  setAnchorIfAvailable(hand, 0.5, 0.7);
  hand.scale.set((handWidth / handTexture.width) * scale, (handHeight / handTexture.height) * scale);
  layers.tutorialHint.addChild(hand);
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

    const nextPixelRatio = Math.min(2, Math.max(1, viewportState?.pixelRatio || globalThis.devicePixelRatio || 1));
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
      // Best-effort: older/newer Pixi APIs may differ in how resolution is updated.
    }
  }

  function resolveFrameWorldMetrics(frame) {
    const layoutState = frame?.layoutState;
    const cameraViewWorldRect = layoutState?.cameraViewWorldRect;
    const gameplayTokens = layoutState?.gameplayTokens;
    const worldWidth = Number.isFinite(cameraViewWorldRect?.width) ? cameraViewWorldRect.width : width;
    const worldHeight = Number.isFinite(cameraViewWorldRect?.height) ? cameraViewWorldRect.height : height;
    const worldY = Number.isFinite(cameraViewWorldRect?.y) ? cameraViewWorldRect.y : 0;
    const fallbackGroundY = options.groundY ?? height * 0.66;
    const runtimeGroundY = gameplayTokens?.runtimeGroundY;
    const groundY = Number.isFinite(runtimeGroundY)
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
      !Number.isFinite(cameraTransform.scale) ||
      !Number.isFinite(worldViewportRect.width) ||
      !Number.isFinite(worldViewportRect.height) ||
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
    const viewportRectX = Number.isFinite(worldViewportRect.x) ? worldViewportRect.x : 0;
    const viewportRectY = Number.isFinite(worldViewportRect.y) ? worldViewportRect.y : 0;
    const cameraWorldX = Number.isFinite(cameraViewWorldRect.x) ? cameraViewWorldRect.x : 0;
    const cameraWorldY = Number.isFinite(cameraViewWorldRect.y) ? cameraViewWorldRect.y : 0;
    const viewportLocalOffsetX = cameraTransform.offsetX - viewportRectX;
    const viewportLocalOffsetY = cameraTransform.offsetY - viewportRectY;

    worldRoot.x =
      viewportLocalOffsetX / canvasScaleX - cameraWorldX * scaleX;
    worldRoot.y =
      viewportLocalOffsetY / canvasScaleY - cameraWorldY * scaleY;
    worldRoot.scale.set(scaleX, scaleY);
    worldRoot.rotation = 0;
    worldRoot.alpha = 1;
    worldRoot.visible = true;
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
          antialias: true,
          autoStart: false,
          sharedTicker: false
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
        drawPlaceholderBackground(PIXI, layers, width, height);
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
      const worldMetrics = resolveFrameWorldMetrics(frame);
      const groundY = worldMetrics.groundY;
      syncWorldRootTransform(frame);
      syncSkyLayer(
        PIXIRef,
        textureCache,
        layers,
        sceneState,
        worldMetrics.worldWidth,
        groundY,
        worldMetrics.worldHeight
      );
      syncDecorLayer(PIXIRef, textureCache, layers, sceneState, worldMetrics.worldWidth, groundY, width);
      syncGroundLayer(
        PIXIRef,
        layers,
        sceneState,
        worldMetrics.worldWidth,
        groundY,
        worldMetrics.worldHeight
      );
      syncCollectiblesLayer(
        PIXIRef,
        textureCache,
        layers,
        sceneState,
        frame?.elapsedSeconds ?? 0
      );
      syncObstaclesLayer(
        PIXIRef,
        textureCache,
        layers,
        sceneState,
        frame?.elapsedSeconds ?? 0
      );
      syncFinishLayer(PIXIRef, textureCache, layers, sceneState, groundY);
      syncEnemyLayer(
        PIXIRef,
        textureCache,
        frameTextureCache,
        layers,
        sceneState,
        frame?.elapsedSeconds ?? 0
      );
      syncWarningsLayer(PIXIRef, layers, sceneState, frame?.elapsedSeconds ?? 0);
      syncPlayerLayer(PIXIRef, textureCache, frameTextureCache, layers, sceneState);
      syncFxLayer(PIXIRef, textureCache, layers, sceneState);
      syncComboPopupsLayer(PIXIRef, layers, sceneState);
      syncTutorialHintLayer(
        PIXIRef,
        textureCache,
        layers,
        sceneState,
        frame?.elapsedSeconds ?? 0,
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
    destroy() {
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
      restoreCanvasInputLayer();
    },
    getLayers() {
      return layers;
    }
  };
}
