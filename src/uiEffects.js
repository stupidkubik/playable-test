export function createUiEffects(options = {}) {
  const {
    elements = {},
    setFooterVisible = () => {},
    shouldAnimateHudCounter = () => true
  } = options;

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
  let lastCounterPulseAt = Number.NEGATIVE_INFINITY;
  const COUNTER_PULSE_MIN_GAP_MS = 200;

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

  async function prewarm({ images = [] } = {}) {
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
    lastCounterPulseAt = Number.NEGATIVE_INFINITY;
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
    if (!paypalCounter || !shouldAnimateHudCounter()) {
      return;
    }

    const now = performance.now();
    if (now - lastCounterPulseAt < COUNTER_PULSE_MIN_GAP_MS) {
      return;
    }
    lastCounterPulseAt = now;

    paypalCounter.classList.remove("pulse");
    if (counterPulseRestartId) {
      cancelAnimationFrame(counterPulseRestartId);
    }
    counterPulseRestartId = requestAnimationFrame(() => {
      paypalCounter.classList.add("pulse");
      counterPulseRestartId = null;
    });
  }

  // Backward-compatible API: fly animation moved to Pixi `hudFx` layer.
  function animateFlyingCollectible() {
    pulseHudCounter();
  }

  return {
    animateFlyingCollectible,
    clearEndTimers,
    prewarm,
    pulseHudCounter,
    resetEndScreenAnimations,
    showEndScreen
  };
}
