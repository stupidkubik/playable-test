function layoutClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function layoutRoundPx(value) {
  return Math.round(value * 100) / 100;
}

// Landscape pacing/perf tuning: fixed gameplay window around the player.
const LANDSCAPE_FIXED_SPAWN_UNIT_PX = 1300;
const LANDSCAPE_FIXED_SPAWN_AHEAD_PX = 1300;
const LANDSCAPE_FIXED_CLEANUP_BEHIND_PX = 800;
const LANDSCAPE_SPAWN_UNIT_BY_BUCKET = Object.freeze({
  landscape_short: 1120,
  landscape_regular: 1160,
  landscape_wide: 1200
});
const PORTRAIT_SPAWN_UNIT_MULTIPLIER_BY_BUCKET = Object.freeze({
  portrait_tall: 1.18,
  portrait_regular: 1.16,
  portrait_tablet: 1.1
});
const PLAYER_X_RATIO_BY_BUCKET = Object.freeze({
  portrait_tall: 0,
  portrait_regular: 0,
  portrait_tablet: 0.06,
  landscape_short: 0.6,
  landscape_regular: 0.8,
  landscape_wide: 1
});

function getVisualViewport() {
  return globalThis.visualViewport || null;
}

function rootRectFallback(designWorldWidth, designWorldHeight) {
  return {
    left: 0,
    top: 0,
    width: globalThis.innerWidth || designWorldWidth,
    height: globalThis.innerHeight || designWorldHeight
  };
}

function readRootRect(root, designWorldWidth, designWorldHeight) {
  if (root?.getBoundingClientRect) {
    return root.getBoundingClientRect();
  }

  return rootRectFallback(designWorldWidth, designWorldHeight);
}

function detectBucket(screenWidth, screenHeight) {
  const aspect = screenWidth / screenHeight;

  if (aspect >= 1 && screenHeight < 460) {
    return "landscape_short";
  }
  if (aspect >= 1.8) {
    return "landscape_wide";
  }
  if (aspect >= 1) {
    return "landscape_regular";
  }
  if (aspect >= 0.75) {
    return "portrait_tablet";
  }
  if (aspect > 0.5) {
    return "portrait_regular";
  }

  return "portrait_tall";
}

function uiDensityForBucket(bucket) {
  return bucket.startsWith("landscape") ? "compact" : "normal";
}

function overlayModeForBucket(bucket) {
  return bucket.startsWith("landscape") ? "compact-stack" : "stack";
}

function footerVariantForBucket(bucket) {
  return bucket.startsWith("landscape") ? "landscape" : "portrait";
}

function playerXRatioForBucket(bucket, fallbackRatio) {
  const value = PLAYER_X_RATIO_BY_BUCKET[bucket];
  if (Number.isFinite(value)) {
    return value;
  }

  return fallbackRatio;
}

function spawnDistanceUnitForBucket(bucket, cameraWorldWidth) {
  if (bucket.startsWith("landscape")) {
    return LANDSCAPE_SPAWN_UNIT_BY_BUCKET[bucket] ?? LANDSCAPE_FIXED_SPAWN_UNIT_PX;
  }

  const multiplier = PORTRAIT_SPAWN_UNIT_MULTIPLIER_BY_BUCKET[bucket] ?? 1;
  return layoutRoundPx(layoutClamp(cameraWorldWidth * multiplier, 680, 980));
}

function safeInsetsFromViewport(rootRect) {
  const vv = getVisualViewport();
  if (!vv) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // Best-effort fallback. CSS env(safe-area-inset-*) remains the primary source.
  const left = layoutClamp(layoutRoundPx(vv.offsetLeft || 0), 0, rootRect.width);
  const top = layoutClamp(layoutRoundPx(vv.offsetTop || 0), 0, rootRect.height);
  const right = layoutClamp(
    layoutRoundPx(Math.max(0, (globalThis.innerWidth || rootRect.width) - (vv.offsetLeft + vv.width))),
    0,
    rootRect.width
  );
  const bottom = layoutClamp(
    layoutRoundPx(Math.max(0, (globalThis.innerHeight || rootRect.height) - (vv.offsetTop + vv.height))),
    0,
    rootRect.height
  );

  return { top, right, bottom, left };
}

function buildSafeRect(screenRect, insets) {
  return {
    x: screenRect.x + insets.left,
    y: screenRect.y + insets.top,
    width: Math.max(1, screenRect.width - insets.left - insets.right),
    height: Math.max(1, screenRect.height - insets.top - insets.bottom),
    insets
  };
}

function cameraAspectCapForBucket(bucket, screenAspect, wideCameraAspectCap) {
  if (bucket === "landscape_wide") {
    return Math.min(screenAspect, wideCameraAspectCap);
  }

  return screenAspect;
}

function buildCameraViewWorldRect({
  bucket,
  screenAspect,
  designWorldHeight,
  wideCameraAspectCap
}) {
  const cameraAspect = cameraAspectCapForBucket(bucket, screenAspect, wideCameraAspectCap);
  const height = designWorldHeight;
  const width = layoutRoundPx(height * cameraAspect);

  // Endless runner composition: keep left edge anchored, reveal more space to the right.
  return {
    x: 0,
    y: 0,
    width,
    height
  };
}

function buildCameraTransform({
  screenRect,
  worldViewportRect,
  cameraViewWorldRect
}) {
  const scale = layoutRoundPx(worldViewportRect.height / cameraViewWorldRect.height);
  const contentWidth = layoutRoundPx(cameraViewWorldRect.width * scale);
  const offsetX = layoutRoundPx(worldViewportRect.x + (worldViewportRect.width - contentWidth) * 0.5);
  const offsetY = layoutRoundPx(worldViewportRect.y);

  return {
    scale,
    offsetX,
    offsetY,
    contentScreenWidth: contentWidth,
    contentScreenHeight: layoutRoundPx(cameraViewWorldRect.height * scale),
    viewportScreenWidth: screenRect.width,
    viewportScreenHeight: screenRect.height
  };
}

function clampByDensity(value, density, compactFactor = 0.88) {
  return density === "compact" ? value * compactFactor : value;
}

function buildUiTokens({
  safeRect,
  bucket,
  footerVariant,
  overlayMode,
  uiDensity
}) {
  const refScale = layoutClamp(Math.min(safeRect.width / 720, safeRect.height / 1280), 0.62, 1.35);
  const densityScale = clampByDensity(refScale, uiDensity, 0.9);
  const isLandscape = bucket.startsWith("landscape");
  const landscapeFooterHeightRatio =
    bucket === "landscape_short" ? 0.2 : bucket === "landscape_regular" ? 0.19 : 0.18;
  const portraitNarrowWidthProgress = isLandscape ? 0 : layoutClamp((500 - safeRect.width) / 180, 0, 1);
  const portraitFooterHeightFactor = 1 - portraitNarrowWidthProgress * 0.14;
  const footerHeight = layoutRoundPx(
    layoutClamp(
      isLandscape ? safeRect.height * landscapeFooterHeightRatio : safeRect.height * 0.12 * portraitFooterHeightFactor,
      isLandscape ? 72 : 60,
      isLandscape ? 170 : 156
    )
  );
  const landscapeFooterCtaBoost = isLandscape ? layoutClamp(safeRect.width / 860, 1.06, 1.3) : 1;
  const footerCtaFont = layoutRoundPx(
    layoutClamp(
      22 * densityScale * (isLandscape ? landscapeFooterCtaBoost * 1.14 : 1),
      isLandscape ? 14 : 10,
      isLandscape ? 28 : 22
    )
  );
  const footerCtaPadX = layoutRoundPx(
    layoutClamp(18 * densityScale * (isLandscape ? landscapeFooterCtaBoost * 1.12 : 1), isLandscape ? 14 : 10, isLandscape ? 28 : 22)
  );
  const footerCtaPadY = layoutRoundPx(
    layoutClamp(10 * densityScale * (isLandscape ? 1.15 : 1), isLandscape ? 8 : 6, isLandscape ? 14 : 12)
  );
  const footerCtaMinWidth = layoutRoundPx(
    layoutClamp(isLandscape ? safeRect.width * 0.155 : 0, isLandscape ? 140 : 0, isLandscape ? 238 : 0)
  );
  const overlayPadding = layoutRoundPx(layoutClamp(18 * densityScale, 10, 28));
  const endModalMaxWidth = layoutRoundPx(
    layoutClamp(isLandscape ? safeRect.width * 0.68 : safeRect.width * 0.88, 300, isLandscape ? 620 : 520)
  );
  const endModalMaxHeight = layoutRoundPx(layoutClamp(safeRect.height * 0.82, 240, safeRect.height - 8));

  return {
    uiScale: layoutRoundPx(densityScale),
    uiDensity,
    footerVariant,
    overlayMode,
    hudPadX: layoutRoundPx(layoutClamp(14 * densityScale, 8, 20)),
    hudPadY: layoutRoundPx(layoutClamp(14 * densityScale, 8, 20)),
    hudGap: layoutRoundPx(layoutClamp(8 * densityScale, 4, 10)),
    hudHeartSize: layoutRoundPx(layoutClamp(50 * densityScale, 16, 32)),
    counterImageW: layoutRoundPx(
      layoutClamp(236 * densityScale * (isLandscape ? 1.12 : 1), isLandscape ? 72 : 64, isLandscape ? 156 : 132)
    ),
    counterFontSize: layoutRoundPx(layoutClamp(44 * densityScale * (isLandscape ? 1.02 : 1), 12, isLandscape ? 24 : 26)),
    counterAmountPadRight: layoutRoundPx(
      layoutClamp(12 * densityScale * (isLandscape ? 1.08 : 1), isLandscape ? 8 : 6, isLandscape ? 16 : 12)
    ),
    footerHeight,
    footerPadX: layoutRoundPx(layoutClamp(12 * densityScale, 8, 14)),
    footerPadBottom: layoutRoundPx(layoutClamp(14 * densityScale, 6, 18)),
    footerCtaFont,
    footerCtaPadX,
    footerCtaPadY,
    footerCtaMinWidth,
    overlayPadding,
    endModalMaxWidth,
    endModalMaxHeight,
    endTitleFont: layoutRoundPx(layoutClamp(32 * densityScale, 18, 34)),
    endSubtitleFont: layoutRoundPx(layoutClamp(20 * densityScale, 11, 22)),
    endCtaFont: layoutRoundPx(layoutClamp(26 * densityScale, 12, 28)),
    countdownFont: layoutRoundPx(layoutClamp(36 * densityScale, 18, 40)),
    failImageMaxSize: layoutRoundPx(layoutClamp(Math.min(safeRect.width, safeRect.height) * 0.55, 120, 420))
  };
}

function buildZones({ safeRect, uiTokens }) {
  const footerRect = {
    x: safeRect.x,
    y: safeRect.y + safeRect.height - uiTokens.footerHeight,
    width: safeRect.width,
    height: uiTokens.footerHeight
  };
  const hudHeight = layoutRoundPx(layoutClamp(uiTokens.hudHeartSize * 2.2, 36, 72));
  const hudRect = {
    x: safeRect.x,
    y: safeRect.y,
    width: safeRect.width,
    height: hudHeight
  };
  const startOverlayRect = {
    x: safeRect.x,
    y: safeRect.y,
    width: safeRect.width,
    height: safeRect.height
  };
  const endOverlayModalRect = {
    x: layoutRoundPx(safeRect.x + (safeRect.width - uiTokens.endModalMaxWidth) * 0.5),
    y: layoutRoundPx(safeRect.y + (safeRect.height - uiTokens.endModalMaxHeight) * 0.5),
    width: uiTokens.endModalMaxWidth,
    height: uiTokens.endModalMaxHeight
  };

  return {
    hudRect,
    footerRect,
    startOverlayRect,
    endOverlayModalRect
  };
}

function buildGameplayTokens({
  cameraViewWorldRect,
  cameraTransform,
  bucket,
  uiTokens,
  designWorldWidth,
  designWorldHeight,
  playerGroundOffset,
  playerXRatio
}) {
  const runtimeGroundY = layoutRoundPx(designWorldHeight - playerGroundOffset);
  const baseVisualScale = layoutRoundPx(layoutClamp(cameraTransform.scale, 0.6, 1.8));
  const compact = bucket.startsWith("landscape");
  const spawnDistancePxPerUnit = spawnDistanceUnitForBucket(bucket, cameraViewWorldRect.width);
  const spawnLeadViewportWidth = compact ? LANDSCAPE_FIXED_SPAWN_AHEAD_PX : layoutRoundPx(cameraViewWorldRect.width);
  const cleanupMarginX = compact
    ? LANDSCAPE_FIXED_CLEANUP_BEHIND_PX
    : layoutRoundPx(layoutClamp(cameraViewWorldRect.width * 0.15, 120, 360));
  const tutorialTextLiftScreenPx = 50;
  const tutorialTextLiftWorld = tutorialTextLiftScreenPx / Math.max(cameraTransform.scale || 1, 0.001);
  const tutorialTextBaseY = cameraViewWorldRect.height * (compact ? 0.52 : 0.57);
  const playerBaseRatio = playerXRatioForBucket(bucket, playerXRatio);

  return {
    runtimeWorldW: cameraViewWorldRect.width,
    runtimeWorldH: cameraViewWorldRect.height,
    spawnReferenceWorldW: spawnDistancePxPerUnit,
    worldToScreenScale: cameraTransform.scale,
    runtimeGroundY,
    playerBaseX: layoutRoundPx(designWorldWidth * playerBaseRatio),
    playerVisualScale: compact ? layoutRoundPx(baseVisualScale * 0.96) : baseVisualScale,
    enemyVisualScale: compact ? layoutRoundPx(baseVisualScale * 0.94) : baseVisualScale,
    obstacleVisualScale: baseVisualScale,
    cleanupMarginX,
    spawnAheadFromPlayer: compact ? LANDSCAPE_FIXED_SPAWN_AHEAD_PX : null,
    cleanupBehindPlayer: compact ? LANDSCAPE_FIXED_CLEANUP_BEHIND_PX : null,
    warningLabelScale: compact ? 0.9 : 1,
    tutorialTextY: layoutRoundPx(tutorialTextBaseY - tutorialTextLiftWorld),
    tutorialHandY: layoutRoundPx(cameraViewWorldRect.height * (compact ? 0.71 : 0.74)),
    gameplaySafeTop: layoutRoundPx(uiTokens.hudPadY + uiTokens.hudHeartSize + 8),
    gameplaySafeBottom: layoutRoundPx(uiTokens.footerHeight + 12),
    spawnDistancePxPerUnit,
    spawnLeadViewportWidth
  };
}

function buildCssVarMap(layoutState) {
  const {
    screenRect,
    safeRect,
    worldViewportRect,
    cameraViewWorldRect,
    cameraTransform,
    uiTokens,
    zones,
    gameplayTokens
  } = layoutState;
  const tutorialTextScreenY = layoutRoundPx(cameraTransform.offsetY + gameplayTokens.tutorialTextY * cameraTransform.scale);
  const tutorialHandScreenY = layoutRoundPx(cameraTransform.offsetY + gameplayTokens.tutorialHandY * cameraTransform.scale);

  return {
    "--layout-screen-x": `${screenRect.x}px`,
    "--layout-screen-y": `${screenRect.y}px`,
    "--layout-screen-w": `${screenRect.width}px`,
    "--layout-screen-h": `${screenRect.height}px`,
    "--layout-safe-top": `${safeRect.insets.top}px`,
    "--layout-safe-right": `${safeRect.insets.right}px`,
    "--layout-safe-bottom": `${safeRect.insets.bottom}px`,
    "--layout-safe-left": `${safeRect.insets.left}px`,
    "--layout-world-viewport-x": `${worldViewportRect.x}px`,
    "--layout-world-viewport-y": `${worldViewportRect.y}px`,
    "--layout-world-viewport-w": `${worldViewportRect.width}px`,
    "--layout-world-viewport-h": `${worldViewportRect.height}px`,
    "--layout-camera-world-w": `${cameraViewWorldRect.width}`,
    "--layout-camera-world-h": `${cameraViewWorldRect.height}`,
    "--layout-camera-scale": `${cameraTransform.scale}`,
    "--layout-camera-offset-x": `${cameraTransform.offsetX}px`,
    "--layout-camera-offset-y": `${cameraTransform.offsetY}px`,
    "--layout-ui-scale": `${uiTokens.uiScale}`,
    "--layout-hud-pad-x": `${uiTokens.hudPadX}px`,
    "--layout-hud-pad-y": `${uiTokens.hudPadY}px`,
    "--layout-hud-gap": `${uiTokens.hudGap}px`,
    "--layout-hud-heart-size": `${uiTokens.hudHeartSize}px`,
    "--layout-counter-image-w": `${uiTokens.counterImageW}px`,
    "--layout-counter-font-size": `${uiTokens.counterFontSize}px`,
    "--layout-counter-amount-pad-right": `${uiTokens.counterAmountPadRight}px`,
    "--layout-footer-h": `${uiTokens.footerHeight}px`,
    "--layout-footer-pad-x": `${uiTokens.footerPadX}px`,
    "--layout-footer-pad-bottom": `${uiTokens.footerPadBottom}px`,
    "--layout-footer-cta-font": `${uiTokens.footerCtaFont}px`,
    "--layout-footer-cta-pad-x": `${uiTokens.footerCtaPadX}px`,
    "--layout-footer-cta-pad-y": `${uiTokens.footerCtaPadY}px`,
    "--layout-footer-cta-min-w": `${uiTokens.footerCtaMinWidth}px`,
    "--layout-overlay-padding": `${uiTokens.overlayPadding}px`,
    "--layout-end-modal-max-w": `${uiTokens.endModalMaxWidth}px`,
    "--layout-end-modal-max-h": `${uiTokens.endModalMaxHeight}px`,
    "--layout-end-title-font": `${uiTokens.endTitleFont}px`,
    "--layout-end-subtitle-font": `${uiTokens.endSubtitleFont}px`,
    "--layout-end-cta-font": `${uiTokens.endCtaFont}px`,
    "--layout-countdown-font": `${uiTokens.countdownFont}px`,
    "--layout-fail-image-max": `${uiTokens.failImageMaxSize}px`,
    "--layout-footer-x": `${zones.footerRect.x}px`,
    "--layout-footer-y": `${zones.footerRect.y}px`,
    "--layout-footer-w": `${zones.footerRect.width}px`,
    "--layout-end-modal-x": `${zones.endOverlayModalRect.x}px`,
    "--layout-end-modal-y": `${zones.endOverlayModalRect.y}px`,
    "--layout-end-modal-w": `${zones.endOverlayModalRect.width}px`,
    "--layout-end-modal-h": `${zones.endOverlayModalRect.height}px`,
    "--layout-tutorial-text-screen-y": `${tutorialTextScreenY}px`,
    "--layout-tutorial-hand-screen-y": `${tutorialHandScreenY}px`
  };
}

function applyLayoutDataAttributes(root, layoutState) {
  if (!root?.dataset) {
    return;
  }

  root.dataset.layoutBucket = layoutState.bucket;
  root.dataset.layoutOrientation = layoutState.orientation;
  root.dataset.layoutUiDensity = layoutState.uiTokens.uiDensity;
  root.dataset.layoutFooterVariant = layoutState.uiTokens.footerVariant;
  root.dataset.layoutOverlayMode = layoutState.uiTokens.overlayMode;
}

function applyLayoutCssVars(root, layoutState) {
  if (!root?.style) {
    return;
  }

  const vars = buildCssVarMap(layoutState);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

export function createLayoutEngine(options = {}) {
  const {
    root,
    designWorldWidth = 720,
    designWorldHeight = 1280,
    maxPixelRatio = 2,
    playerGroundOffset = 280,
    playerXRatio = 0.1,
    wideCameraAspectCap = 1.65
  } = options;

  let state = null;
  let resizeObserver = null;
  let rafId = 0;
  const subscribers = new Set();

  function buildState() {
    const rootRect = readRootRect(root, designWorldWidth, designWorldHeight);
    const screenRect = {
      x: layoutRoundPx(rootRect.left || 0),
      y: layoutRoundPx(rootRect.top || 0),
      width: Math.max(1, layoutRoundPx(rootRect.width || designWorldWidth)),
      height: Math.max(1, layoutRoundPx(rootRect.height || designWorldHeight))
    };

    const safeInsets = safeInsetsFromViewport(rootRect);
    const safeRect = buildSafeRect(screenRect, safeInsets);
    const screenAspect = screenRect.width / screenRect.height;
    const bucket = detectBucket(screenRect.width, screenRect.height);
    const orientation = screenAspect >= 1 ? "landscape" : "portrait";
    const worldViewportRect = {
      x: 0,
      y: 0,
      width: screenRect.width,
      height: screenRect.height
    };

    const cameraViewWorldRect = buildCameraViewWorldRect({
      bucket,
      screenAspect,
      designWorldHeight,
      wideCameraAspectCap
    });
    const cameraTransform = buildCameraTransform({
      screenRect,
      worldViewportRect,
      cameraViewWorldRect
    });
    const footerVariant = footerVariantForBucket(bucket);
    const overlayMode = overlayModeForBucket(bucket);
    const uiDensity = uiDensityForBucket(bucket);
    const uiTokens = buildUiTokens({
      safeRect,
      bucket,
      footerVariant,
      overlayMode,
      uiDensity
    });
    const zones = buildZones({ safeRect, uiTokens });
    const gameplayTokens = buildGameplayTokens({
      cameraViewWorldRect,
      cameraTransform,
      bucket,
      uiTokens,
      designWorldWidth,
      designWorldHeight,
      playerGroundOffset,
      playerXRatio
    });

    return {
      designWorld: {
        width: designWorldWidth,
        height: designWorldHeight
      },
      pixelRatio: layoutClamp(globalThis.devicePixelRatio || 1, 1, maxPixelRatio),
      screenRect,
      safeRect,
      bucket,
      orientation,
      worldViewportRect,
      cameraViewWorldRect,
      cameraTransform,
      zones,
      uiTokens,
      gameplayTokens,
      caps: {
        wideCameraAspectCap
      }
    };
  }

  function notify(nextState) {
    state = nextState;
    applyLayoutCssVars(root, state);
    applyLayoutDataAttributes(root, state);
    for (const subscriber of subscribers) {
      subscriber(state);
    }
  }

  function measureNow() {
    const nextState = buildState();
    notify(nextState);
    return nextState;
  }

  function scheduleMeasure() {
    if (rafId) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = 0;
      measureNow();
    });
  }

  function handleResize() {
    scheduleMeasure();
  }

  function start() {
    measureNow();
    globalThis.addEventListener("resize", handleResize, { passive: true });
    globalThis.addEventListener("orientationchange", handleResize, { passive: true });
    getVisualViewport()?.addEventListener("resize", handleResize, { passive: true });

    if (globalThis.ResizeObserver && root) {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(root);
    }
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    globalThis.removeEventListener("resize", handleResize);
    globalThis.removeEventListener("orientationchange", handleResize);
    getVisualViewport()?.removeEventListener("resize", handleResize);

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  function getState() {
    if (!state) {
      return measureNow();
    }

    return state;
  }

  function projectWorldToScreen(x, y) {
    const current = getState();
    const { cameraViewWorldRect, cameraTransform } = current;
    return {
      x: cameraTransform.offsetX + (x - cameraViewWorldRect.x) * cameraTransform.scale,
      y: cameraTransform.offsetY + (y - cameraViewWorldRect.y) * cameraTransform.scale
    };
  }

  function projectScreenToWorld(x, y) {
    const current = getState();
    const { cameraViewWorldRect, cameraTransform } = current;
    return {
      x: (x - cameraTransform.offsetX) / cameraTransform.scale + cameraViewWorldRect.x,
      y: (y - cameraTransform.offsetY) / cameraTransform.scale + cameraViewWorldRect.y
    };
  }

  function subscribe(handler, { immediate = true } = {}) {
    subscribers.add(handler);

    if (immediate) {
      handler(getState());
    }

    return () => {
      subscribers.delete(handler);
    };
  }

  return {
    start,
    stop,
    measureNow,
    getState,
    subscribe,
    projectWorldToScreen,
    projectScreenToWorld
  };
}
