import { createLayoutEngine } from "./layout/layoutEngine.js";

function roundPx(value) {
  return Math.round(value * 100) / 100;
}

function buildContainViewport(layoutState, worldWidth, worldHeight) {
  const shellRect = layoutState.screenRect;
  const scale = Math.min(shellRect.width / worldWidth, shellRect.height / worldHeight);
  const viewportWidth = roundPx(worldWidth * scale);
  const viewportHeight = roundPx(worldHeight * scale);
  const viewportX = roundPx((shellRect.width - viewportWidth) * 0.5);
  const viewportY = roundPx((shellRect.height - viewportHeight) * 0.5);

  return {
    scale,
    uiScale: scale,
    viewportRect: {
      x: viewportX,
      y: viewportY,
      width: viewportWidth,
      height: viewportHeight
    },
    viewportPageRect: {
      left: shellRect.x + viewportX,
      top: shellRect.y + viewportY,
      width: viewportWidth,
      height: viewportHeight
    },
    gaps: {
      left: viewportX,
      top: viewportY,
      right: roundPx(shellRect.width - viewportX - viewportWidth),
      bottom: roundPx(shellRect.height - viewportY - viewportHeight)
    }
  };
}

function applyLegacyViewportCssVars(root, nextState) {
  if (!root?.style || !nextState) {
    return;
  }

  const { viewportRect, gaps, scale, uiScale } = nextState;
  root.style.setProperty("--game-viewport-x", `${viewportRect.x}px`);
  root.style.setProperty("--game-viewport-y", `${viewportRect.y}px`);
  root.style.setProperty("--game-viewport-w", `${viewportRect.width}px`);
  root.style.setProperty("--game-viewport-h", `${viewportRect.height}px`);
  root.style.setProperty("--game-viewport-right-gap", `${gaps.right}px`);
  root.style.setProperty("--game-viewport-bottom-gap", `${gaps.bottom}px`);
  root.style.setProperty("--game-scale", `${scale}`);
  root.style.setProperty("--ui-scale", `${uiScale}`);

  root.dataset.viewportOrientation = nextState.orientation;
  root.dataset.viewportAspectBucket = nextState.aspectBucket;
}

export function createViewportManager(options = {}) {
  const {
    root,
    worldWidth = 720,
    worldHeight = 1280,
    maxPixelRatio = 2
  } = options;

  const layoutEngine = createLayoutEngine({
    root,
    designWorldWidth: worldWidth,
    designWorldHeight: worldHeight,
    maxPixelRatio
  });

  let state = null;
  const subscribers = new Set();

  function mapLayoutState(layoutState) {
    const legacy = buildContainViewport(layoutState, worldWidth, worldHeight);
    return {
      worldWidth,
      worldHeight,
      pixelRatio: layoutState.pixelRatio,
      scale: legacy.scale,
      uiScale: legacy.uiScale,
      orientation: layoutState.orientation,
      aspectBucket: layoutState.bucket,
      shellRect: {
        left: layoutState.screenRect.x,
        top: layoutState.screenRect.y,
        width: layoutState.screenRect.width,
        height: layoutState.screenRect.height
      },
      viewportRect: legacy.viewportRect,
      viewportPageRect: legacy.viewportPageRect,
      gaps: legacy.gaps,
      layoutState
    };
  }

  function notify(nextLayoutState) {
    state = mapLayoutState(nextLayoutState);
    applyLegacyViewportCssVars(root, state);

    for (const subscriber of subscribers) {
      subscriber(state);
    }
  }

  layoutEngine.subscribe(notify, { immediate: false });

  function measureNow() {
    return mapLayoutState(layoutEngine.measureNow());
  }

  function getState() {
    if (!state) {
      state = mapLayoutState(layoutEngine.getState());
      applyLegacyViewportCssVars(root, state);
    }

    return state;
  }

  // NOTE: Phase 1 keeps existing runtime behavior (contain viewport mapping) for compatibility.
  // Future phases should switch current callers to layoutState.cameraTransform projections.
  function projectWorldToScreen(x, y) {
    const current = getState();
    return {
      x: current.viewportPageRect.left + (x / worldWidth) * current.viewportRect.width,
      y: current.viewportPageRect.top + (y / worldHeight) * current.viewportRect.height
    };
  }

  function projectScreenToWorld(x, y) {
    const current = getState();
    return {
      x: ((x - current.viewportPageRect.left) / current.viewportRect.width) * worldWidth,
      y: ((y - current.viewportPageRect.top) / current.viewportRect.height) * worldHeight
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
    start: () => layoutEngine.start(),
    stop: () => layoutEngine.stop(),
    measureNow,
    getState,
    subscribe,
    projectWorldToScreen,
    projectScreenToWorld,
    getLayoutState() {
      return getState().layoutState;
    }
  };
}

export { createLayoutEngine } from "./layout/layoutEngine.js";
