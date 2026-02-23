export function createUiEffects({
  canvas,
  gameWidth,
  gameHeight,
  elements,
  setFooterVisible,
  getCollectibleImage
}) {
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
    void paypalCardContainer?.offsetHeight;
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
    paypalCardContainer?.classList.add("animate-scale");
    lightsEffect?.classList.add("animate-lights");
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
      failImage.style.animation = "none";
      void failImage.offsetHeight;
      failImage.style.animation = "";
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
    void paypalCounter.offsetWidth;
    paypalCounter.classList.add("pulse");
  }

  function gamePointToViewport(x, y) {
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

    const flying = document.createElement("div");
    flying.className = "flying-collectible";
    flying.style.setProperty("--fly-duration", "0.4s");
    flying.style.left = `${fromX}px`;
    flying.style.top = `${fromY}px`;

    const icon = document.createElement("img");
    icon.src = image.src;
    icon.alt = "";
    flying.appendChild(icon);

    const keyframeName = `flyCollectible-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const style = document.createElement("style");
    style.textContent = `
@keyframes ${keyframeName} {
  0% {
    left: ${fromX}px;
    top: ${fromY}px;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    left: ${toX}px;
    top: ${toY}px;
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.45);
  }
}`;
    document.head.appendChild(style);

    flying.style.animation = `${keyframeName} 0.4s ease-in forwards`;
    document.body.appendChild(flying);

    flying.addEventListener(
      "animationend",
      () => {
        pulseHudCounter();
        flying.remove();
        style.remove();
      },
      { once: true }
    );
  }

  return {
    animateFlyingCollectible,
    clearEndTimers,
    resetEndScreenAnimations,
    showEndScreen
  };
}
