import { createLayoutEngine } from "./layout/layoutEngine.js";

function roundPx(value) {
  return Math.round(value * 100) / 100;
}

function buildLayoutViewport(layoutState) {
  const viewportRect = {
    x: roundPx(layoutState?.worldViewportRect?.x ?? 0),
    y: roundPx(layoutState?.worldViewportRect?.y ?? 0),
    width: roundPx(layoutState?.worldViewportRect?.width ?? layoutState?.screenRect?.width ?? 0),
    height: roundPx(layoutState?.worldViewportRect?.height ?? layoutState?.screenRect?.height ?? 0)
  };

  return {
    scale: layoutState?.cameraTransform?.scale ?? 1,
    uiScale: layoutState?.uiTokens?.uiScale ?? 1,
    viewportRect,
    viewportPageRect: {
      left: roundPx((layoutState?.screenRect?.x ?? 0) + viewportRect.x),
      top: roundPx((layoutState?.screenRect?.y ?? 0) + viewportRect.y),
      width: viewportRect.width,
      height: viewportRect.height
    },
    gaps: {
      left: roundPx(viewportRect.x),
      top: roundPx(viewportRect.y),
      right: roundPx(
        Math.max(
          0,
          (layoutState?.screenRect?.width ?? viewportRect.width) - viewportRect.x - viewportRect.width
        )
      ),
      bottom: roundPx(
        Math.max(
          0,
          (layoutState?.screenRect?.height ?? viewportRect.height) - viewportRect.y - viewportRect.height
        )
      )
    }
  };
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
    const runtimeViewport = buildLayoutViewport(layoutState);
    return {
      worldWidth,
      worldHeight,
      pixelRatio: layoutState.pixelRatio,
      scale: runtimeViewport.scale,
      uiScale: runtimeViewport.uiScale,
      orientation: layoutState.orientation,
      aspectBucket: layoutState.bucket,
      shellRect: {
        left: layoutState.screenRect.x,
        top: layoutState.screenRect.y,
        width: layoutState.screenRect.width,
        height: layoutState.screenRect.height
      },
      viewportRect: runtimeViewport.viewportRect,
      viewportPageRect: runtimeViewport.viewportPageRect,
      gaps: runtimeViewport.gaps,
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

  function projectWorldToScreen(x, y) {
    const current = getState();
    const projected = layoutEngine.projectWorldToScreen(x, y);
    return {
      x: current.shellRect.left + projected.x,
      y: current.shellRect.top + projected.y
    };
  }

  function projectScreenToWorld(x, y) {
    const current = getState();
    return layoutEngine.projectScreenToWorld(x - current.shellRect.left, y - current.shellRect.top);
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
