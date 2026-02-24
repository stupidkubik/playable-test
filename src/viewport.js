function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPx(value) {
  return Math.round(value * 100) / 100;
}

function getVisualViewport() {
  return globalThis.visualViewport || null;
}

export function createViewportManager(options = {}) {
  const {
    root,
    worldWidth = 720,
    worldHeight = 1280,
    maxPixelRatio = 2
  } = options;

  let state = null;
  let resizeObserver = null;
  let rafId = 0;
  const subscribers = new Set();

  function rootRect() {
    if (root?.getBoundingClientRect) {
      return root.getBoundingClientRect();
    }

    return {
      left: 0,
      top: 0,
      width: globalThis.innerWidth || worldWidth,
      height: globalThis.innerHeight || worldHeight
    };
  }

  function buildState() {
    const rect = rootRect();
    const shellWidth = Math.max(1, rect.width || worldWidth);
    const shellHeight = Math.max(1, rect.height || worldHeight);
    const scale = Math.min(shellWidth / worldWidth, shellHeight / worldHeight);
    const viewportWidth = roundPx(worldWidth * scale);
    const viewportHeight = roundPx(worldHeight * scale);
    const viewportX = roundPx((shellWidth - viewportWidth) * 0.5);
    const viewportY = roundPx((shellHeight - viewportHeight) * 0.5);
    const rightGap = roundPx(shellWidth - viewportX - viewportWidth);
    const bottomGap = roundPx(shellHeight - viewportY - viewportHeight);
    const pixelRatio = clamp(globalThis.devicePixelRatio || 1, 1, maxPixelRatio);
    const shellLeft = rect.left || 0;
    const shellTop = rect.top || 0;
    const orientation = shellWidth >= shellHeight ? "landscape" : "portrait";
    const screenAspect = shellWidth / shellHeight;
    let aspectBucket = "portrait";

    if (screenAspect >= 1.7) {
      aspectBucket = "ultra-wide";
    } else if (screenAspect >= 1) {
      aspectBucket = "landscape";
    } else if (screenAspect > 0.75) {
      aspectBucket = "tablet";
    }

    return {
      worldWidth,
      worldHeight,
      scale,
      uiScale: scale,
      pixelRatio,
      orientation,
      aspectBucket,
      shellRect: {
        left: shellLeft,
        top: shellTop,
        width: shellWidth,
        height: shellHeight
      },
      viewportRect: {
        x: viewportX,
        y: viewportY,
        width: viewportWidth,
        height: viewportHeight
      },
      viewportPageRect: {
        left: shellLeft + viewportX,
        top: shellTop + viewportY,
        width: viewportWidth,
        height: viewportHeight
      },
      gaps: {
        left: viewportX,
        top: viewportY,
        right: rightGap,
        bottom: bottomGap
      }
    };
  }

  function applyCssVars(nextState) {
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

  function notify(nextState) {
    state = nextState;
    applyCssVars(state);
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

    const visualViewport = getVisualViewport();
    visualViewport?.addEventListener("resize", handleResize, { passive: true });

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
    start,
    stop,
    measureNow,
    getState,
    subscribe,
    projectWorldToScreen,
    projectScreenToWorld
  };
}
