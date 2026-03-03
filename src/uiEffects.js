export function createUiEffects({
  canvas,
  gameWidth,
  gameHeight,
  elements,
  setFooterVisible,
  getCollectibleImage,
  projectWorldToScreen
}) {
  const FLY_DURATION_MS = 400;
  const FLY_POOL_PREWARM_DEFAULT = 14;
  const FLY_POOL_MAX = 24;

  const {
    endOverlay,
    endTitle,
    endSubtitle,
    ctaButton,
    countdownContainer,
    countdownTime,
    failImage,
    failOverlay,
    paypalCardWrapper,
    paypalCardContainer,
    lightsEffect,
    endAmountLabel,
    paypalCounter
  } = elements;

  let countdownIntervalId = null;
  let balanceAnimationId = null;
  let failTimeoutId = null;
  let endAnimationRestartId = null;
  let failImageRestartId = null;
  let counterPulseRestartId = null;
  let flyingLayer = null;
  let flyingNodesCreated = 0;
  const flyingPool = [];
  const activeFlying = new Set();

  function ensureFlyingLayer() {
    if (flyingLayer?.isConnected) {
      return flyingLayer;
    }

    flyingLayer = document.createElement("div");
    flyingLayer.className = "flying-collectible-layer";
    document.body.appendChild(flyingLayer);
    return flyingLayer;
  }

  function createFlyingNode() {
    if (flyingNodesCreated >= FLY_POOL_MAX) {
      return null;
    }

    const root = document.createElement("div");
    root.className = "flying-collectible";
    root.style.display = "none";
    root.style.left = "0px";
    root.style.top = "0px";
    root.style.opacity = "1";
    root.style.transform = "translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)";

    const icon = document.createElement("img");
    icon.alt = "";
    root.appendChild(icon);

    ensureFlyingLayer().appendChild(root);
    flyingNodesCreated += 1;
    return {
      root,
      icon,
      animation: null,
      fallbackTimerId: null,
      inPool: false
    };
  }

  function stopFlyingNodeAnimation(node) {
    if (!node) {
      return;
    }

    if (node.animation) {
      node.animation.onfinish = null;
      node.animation.oncancel = null;
      try {
        node.animation.cancel();
      } catch {
        // Best-effort cleanup only.
      }
      node.animation = null;
    }

    if (node.fallbackTimerId) {
      clearTimeout(node.fallbackTimerId);
      node.fallbackTimerId = null;
    }
  }

  function releaseFlyingNode(node) {
    if (!node) {
      return;
    }

    stopFlyingNodeAnimation(node);
    activeFlying.delete(node);
    node.root.style.display = "none";
    node.root.style.opacity = "1";
    node.root.style.transition = "";
    node.root.style.transform = "translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)";

    if (!node.inPool) {
      node.inPool = true;
      flyingPool.push(node);
    }
  }

  function clearFlyingCollectibles() {
    for (const node of Array.from(activeFlying)) {
      releaseFlyingNode(node);
    }
  }

  function acquireFlyingNode() {
    const node = flyingPool.pop() || createFlyingNode();
    if (!node) {
      return null;
    }

    node.inPool = false;
    activeFlying.add(node);
    return node;
  }

  function ensureFlyingPoolSize(targetSize = FLY_POOL_PREWARM_DEFAULT) {
    const desired = Math.max(0, Math.min(FLY_POOL_MAX, Math.round(targetSize)));
    ensureFlyingLayer();
    while (flyingPool.length + activeFlying.size < desired) {
      const node = createFlyingNode();
      if (!node) {
        break;
      }
      node.inPool = true;
      flyingPool.push(node);
    }
  }

  function decodeImageIfPossible(image) {
    if (!image) {
      return Promise.resolve(false);
    }

    if (typeof image.decode === "function") {
      return image
        .decode()
        .then(() => true)
        .catch(() => Boolean(image.complete && image.naturalWidth > 0));
    }

    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) {
          return;
        }
        settled = true;
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
        clearTimeout(timerId);
        resolve(ok);
      };
      const onLoad = () => finish(true);
      const onError = () => finish(false);
      const timerId = setTimeout(() => finish(Boolean(image.complete && image.naturalWidth > 0)), 2000);

      image.addEventListener("load", onLoad, { once: true });
      image.addEventListener("error", onError, { once: true });
    });
  }

  async function prewarm({ images = [], flyingPoolSize = FLY_POOL_PREWARM_DEFAULT } = {}) {
    ensureFlyingPoolSize(flyingPoolSize);
    const uniqueImages = [];
    const seen = new Set();
    for (const image of images) {
      if (!image || seen.has(image)) {
        continue;
      }
      seen.add(image);
      uniqueImages.push(image);
    }
    if (uniqueImages.length === 0) {
      return;
    }

    await Promise.allSettled(uniqueImages.map((image) => decodeImageIfPossible(image)));
  }

  function clearEndTimers() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }

    if (balanceAnimationId) {
      cancelAnimationFrame(balanceAnimationId);
      balanceAnimationId = null;
    }

    if (failTimeoutId) {
      clearTimeout(failTimeoutId);
      failTimeoutId = null;
    }

    if (endAnimationRestartId) {
      cancelAnimationFrame(endAnimationRestartId);
      endAnimationRestartId = null;
    }

    if (failImageRestartId) {
      cancelAnimationFrame(failImageRestartId);
      failImageRestartId = null;
    }

    if (counterPulseRestartId) {
      cancelAnimationFrame(counterPulseRestartId);
      counterPulseRestartId = null;
    }

    clearFlyingCollectibles();
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

    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }

    let remaining = durationSeconds;
    countdownContainer.classList.remove("hidden");
    updateCountdownDisplay(remaining);

    countdownIntervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        countdownContainer.classList.add("hidden");
        if (countdownIntervalId) {
          clearInterval(countdownIntervalId);
          countdownIntervalId = null;
        }
        return;
      }

      updateCountdownDisplay(remaining);
    }, 1000);
  }

  function resetEndScreenAnimations() {
    if (balanceAnimationId) {
      cancelAnimationFrame(balanceAnimationId);
      balanceAnimationId = null;
    }

    if (endAmountLabel) {
      endAmountLabel.textContent = "$0.00";
    }

    paypalCardWrapper?.classList.remove("hidden");
    paypalCardContainer?.classList.remove("animate-scale");
    lightsEffect?.classList.remove("animate-lights");

    if (endAnimationRestartId) {
      cancelAnimationFrame(endAnimationRestartId);
      endAnimationRestartId = null;
    }
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
        balanceAnimationId = requestAnimationFrame(tick);
      } else {
        balanceAnimationId = null;
      }
    };

    balanceAnimationId = requestAnimationFrame(tick);
  }

  function playEndScreenAnimations(totalReward) {
    resetEndScreenAnimations();
    endAnimationRestartId = requestAnimationFrame(() => {
      paypalCardContainer?.classList.add("animate-scale");
      lightsEffect?.classList.add("animate-lights");
      endAnimationRestartId = null;
    });
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
      failImage.classList.remove("animate-fail-in");
      if (failImageRestartId) {
        cancelAnimationFrame(failImageRestartId);
      }
      failImageRestartId = requestAnimationFrame(() => {
        failImage.classList.add("animate-fail-in");
        failImageRestartId = null;
      });
    }

    failTimeoutId = setTimeout(() => {
      failOverlay.classList.add("hidden");
      endOverlay.classList.add("overlay-visible");
      playEndScreenAnimations(totalReward);
      startCountdown(60);
      failTimeoutId = null;
    }, 1500);
  }

  function showEndScreen(isWin, totalReward) {
    clearEndTimers();
    setFooterVisible(false);
    endOverlay.classList.toggle("win-overlay", isWin);

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

  function pulseHudCounter() {
    if (!paypalCounter) {
      return;
    }

    paypalCounter.classList.remove("pulse");
    if (counterPulseRestartId) {
      cancelAnimationFrame(counterPulseRestartId);
    }
    counterPulseRestartId = requestAnimationFrame(() => {
      paypalCounter.classList.add("pulse");
      counterPulseRestartId = null;
    });
  }

  function gamePointToViewport(x, y) {
    if (typeof projectWorldToScreen === "function") {
      const projected = projectWorldToScreen(x, y);
      if (projected && Number.isFinite(projected.x) && Number.isFinite(projected.y)) {
        return projected;
      }
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (x / gameWidth) * rect.width,
      y: rect.top + (y / gameHeight) * rect.height
    };
  }

  function animateFlyingCollectible(from, type = "dollar") {
    if (!paypalCounter) {
      return;
    }

    const toRect = paypalCounter.getBoundingClientRect();
    if (!toRect.width || !toRect.height) {
      return;
    }

    const { x: fromX, y: fromY } = gamePointToViewport(from.x, from.y);
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;

    const image = getCollectibleImage(type);
    if (!image?.src) {
      pulseHudCounter();
      return;
    }

    const node = acquireFlyingNode();
    if (!node) {
      pulseHudCounter();
      return;
    }

    const flying = node.root;
    const icon = node.icon;
    if (icon.src !== image.src) {
      icon.src = image.src;
    }
    flying.style.left = `${fromX}px`;
    flying.style.top = `${fromY}px`;
    flying.style.display = "block";
    flying.style.opacity = "1";
    flying.style.transition = "";
    flying.style.transform = "translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)";

    const cleanup = () => {
      if (!activeFlying.has(node)) {
        return;
      }
      releaseFlyingNode(node);
      // Trigger pulse after release to keep DOM write burst minimal.
      pulseHudCounter();
    };

    const moveX = toX - fromX;
    const moveY = toY - fromY;

    if (typeof flying.animate === "function") {
      node.animation = flying.animate(
        [
          {
            opacity: 1,
            transform: "translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)"
          },
          {
            opacity: 0.8,
            transform: `translate(-50%, -50%) translate3d(${moveX}px, ${moveY}px, 0) scale(0.45)`
          }
        ],
        {
          duration: FLY_DURATION_MS,
          easing: "ease-in",
          fill: "forwards"
        }
      );
      node.animation.onfinish = cleanup;
      node.animation.oncancel = cleanup;
      return;
    }

    flying.style.transition = `transform ${FLY_DURATION_MS}ms ease-in, opacity ${FLY_DURATION_MS}ms ease-in`;
    requestAnimationFrame(() => {
      if (!activeFlying.has(node)) {
        return;
      }
      flying.style.opacity = "0.8";
      flying.style.transform = `translate(-50%, -50%) translate3d(${moveX}px, ${moveY}px, 0) scale(0.45)`;
    });
    node.fallbackTimerId = setTimeout(() => {
      node.fallbackTimerId = null;
      cleanup();
    }, FLY_DURATION_MS + 40);
  }

  return {
    animateFlyingCollectible,
    clearEndTimers,
    prewarm,
    resetEndScreenAnimations,
    showEndScreen
  };
}
