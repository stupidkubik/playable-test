function parseBooleanFlag(rawValue, fallback = false) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePositiveNumberParam(params, key, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const raw = params.get(key);
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function parseNonNegativeIntParam(params, key, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = params.get(key);
  const parsed = raw === null || raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.round(Math.min(max, Math.max(min, parsed)));
}

function parseStressViewport(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  const match = normalized.match(/^(\d{2,4})x(\d{2,4})$/);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 240 || height < 180) {
    return null;
  }

  return { width, height };
}

export function readStressConfig() {
  const search = globalThis.location?.search || "";
  const params = new URLSearchParams(search);
  const profile = (params.get("stressProfile") || "default").trim().toLowerCase() === "heavy"
    ? "heavy"
    : "default";
  const heavyProfile = profile === "heavy";
  const queryEnabled = parseBooleanFlag(params.get("stress"), false);
  const globalEnabled = globalThis.__PLAYABLE_STRESS__ === true;
  let storageEnabled = false;

  try {
    const storageValue = globalThis.localStorage?.getItem("playable:stress");
    storageEnabled = storageValue === "1" || storageValue === "true";
  } catch {
    storageEnabled = false;
  }

  const enabled = queryEnabled || storageEnabled || globalEnabled;
  const stressWidthRaw = params.get("stressWidth");
  const stressHeightRaw = params.get("stressHeight");
  const stressWidth = stressWidthRaw ? Number(stressWidthRaw) : Number.NaN;
  const stressHeight = stressHeightRaw ? Number(stressHeightRaw) : Number.NaN;
  const viewportFromPair =
    Number.isFinite(stressWidth) && Number.isFinite(stressHeight)
      ? {
          width: stressWidth,
          height: stressHeight
        }
      : null;
  const viewportFromQuery = parseStressViewport(params.get("stressViewport"));
  const viewport =
    viewportFromQuery ||
    (viewportFromPair &&
    viewportFromPair.width >= 240 &&
    viewportFromPair.width <= 4000 &&
    viewportFromPair.height >= 180 &&
    viewportFromPair.height <= 4000
      ? viewportFromPair
      : null);
  const frameBudgetMs = parsePositiveNumberParam(
    params,
    "stressFrameBudgetMs",
    1000 / 60,
    { min: 8, max: 80 }
  );
  const alertFrameP95Default = Math.max(16, frameBudgetMs * 1.15);
  const alertFrameP99Default = Math.max(24, frameBudgetMs * 1.45);
  const alertSectionP95Default = Math.max(4, frameBudgetMs * 0.2);

  return {
    enabled,
    profile,
    heavyProfile,
    durationMs: Math.round(parsePositiveNumberParam(params, "stressDurationSec", 90, { min: 10, max: 900 }) * 1000),
    frameBudgetMs,
    hud: parseBooleanFlag(params.get("stressHud"), true),
    autoStart: parseBooleanFlag(params.get("stressAutoStart"), true),
    autoRestart: parseBooleanFlag(params.get("stressAutoRestart"), true),
    invincible: parseBooleanFlag(params.get("stressInvincible"), false),
    infiniteLives: parseBooleanFlag(params.get("stressInfiniteLives"), true),
    pauseAutoResumeMs: Math.round(
      parsePositiveNumberParam(params, "stressPauseAutoResumeMs", 2000, { min: 200, max: 30_000 })
    ),
    muteAudio: parseBooleanFlag(params.get("stressMuteAudio"), true),
    hudUpdateMs: parsePositiveNumberParam(params, "stressHudUpdateMs", 1000, { min: 150, max: 10_000 }),
    maxSamples: Math.round(parsePositiveNumberParam(params, "stressMaxSamples", 12_000, { min: 400, max: 100_000 })),
    downloadReport: parseBooleanFlag(params.get("stressDownloadReport"), false),
    logEvents: parseBooleanFlag(params.get("stressLog"), true),
    maxEventLog: Math.round(parsePositiveNumberParam(params, "stressEventLogMax", 600, { min: 120, max: 10_000 })),
    maxAlertHistory: Math.round(parsePositiveNumberParam(params, "stressAlertHistoryMax", 200, { min: 40, max: 5000 })),
    alerts: {
      enabled: parseBooleanFlag(params.get("stressAlerts"), true),
      cooldownMs: Math.round(parsePositiveNumberParam(params, "stressAlertCooldownMs", 2500, { min: 0, max: 60_000 })),
      frameP95Ms: parsePositiveNumberParam(params, "stressAlertFrameP95Ms", alertFrameP95Default, { min: 1, max: 300 }),
      frameP99Ms: parsePositiveNumberParam(params, "stressAlertFrameP99Ms", alertFrameP99Default, { min: 1, max: 600 }),
      sectionP95Ms: parsePositiveNumberParam(params, "stressAlertSectionP95Ms", alertSectionP95Default, { min: 1, max: 120 }),
      overBudgetPct: parsePositiveNumberParam(params, "stressAlertOverBudgetPct", 22, { min: 1, max: 100 }),
      droppedFrames: Math.round(parsePositiveNumberParam(params, "stressAlertDroppedFrames", 12, { min: 1, max: 5000 }))
    },
    load: {
      landscapeUncap: parseBooleanFlag(params.get("stressLandscapeUncap"), heavyProfile),
      spawnBurstScale: parsePositiveNumberParam(
        params,
        "stressSpawnBurstScale",
        heavyProfile ? 4 : 1,
        { min: 1, max: 12 }
      ),
      spawnDistanceScale: parsePositiveNumberParam(
        params,
        "stressSpawnDistanceScale",
        heavyProfile ? 2.2 : 1,
        { min: 0.25, max: 8 }
      ),
      extraEnemiesPerSpawn: parseNonNegativeIntParam(
        params,
        "stressExtraEnemies",
        heavyProfile ? 2 : 0,
        { min: 0, max: 24 }
      ),
      extraObstaclesPerSpawn: parseNonNegativeIntParam(
        params,
        "stressExtraObstacles",
        heavyProfile ? 2 : 0,
        { min: 0, max: 24 }
      ),
      extraCollectiblesPerSpawn: parseNonNegativeIntParam(
        params,
        "stressExtraCollectibles",
        heavyProfile ? 4 : 0,
        { min: 0, max: 40 }
      ),
      entityCapPerType: parseNonNegativeIntParam(
        params,
        "stressEntityCap",
        heavyProfile ? 220 : 180,
        { min: 10, max: 2000 }
      )
    },
    viewport
  };
}

export function applyStressViewportOverride(config, options = {}) {
  const { appShell = null, body = document.body } = options;
  if (!config.enabled || !config.viewport || !appShell?.style) {
    return;
  }

  const { width, height } = config.viewport;
  appShell.style.width = `${width}px`;
  appShell.style.height = `${height}px`;
  appShell.style.maxWidth = `${width}px`;
  appShell.style.maxHeight = `${height}px`;
  appShell.style.margin = "0 auto";

  if (body?.style) {
    body.style.display = "grid";
    body.style.placeItems = "center";
    body.style.background = "#0f172a";
  }
}

export function createStressMode(config, deps = {}) {
  const {
    state = null,
    STATES = null,
    startRun = null,
    resumeFromTutorial = null,
    resetWorld = null,
    currentLayoutState = null
  } = deps;
  const RUNNING_STALL_MIN_MS = 120;
  const RUNNING_STALL_DISTANCE_EPSILON = 0.05;
  const RUNNING_STALL_TRANSITION_GRACE_MS = 650;
  const FREEZE_CONTEXT_WINDOW_MS = 900;
  const FREEZE_WINDOW_LIMIT = 240;
  const TRANSITION_FREEZE_REASONS = new Set([
    "mode-transition",
    "distance-reset",
    "transition-grace",
    "session-end"
  ]);
  const FREEZE_EVENT_CODES = new Set([
    "collision-enemy",
    "collision-obstacle",
    "player-hit",
    "tutorial-pause",
    "tutorial-resume",
    "pause-autoresume-armed",
    "running-progress-stall",
    "sound-start"
  ]);

  const disabledApi = {
    enabled: false,
    config,
    installGlobals() {},
    isInvincible() {
      return false;
    },
    hasInfiniteLives() {
      return false;
    },
    isAudioMuted() {
      return false;
    },
    recordSection() {},
    recordRafSkip() {},
    recordFrame() {},
    traceGameplayEvent() {},
    recordSoundStart() {},
    ensureAutoProgress() {},
    onBootReady() {},
    shouldBypassLandscapeCap() {
      return false;
    },
    spawnBurstLimit(baseLimit) {
      return baseLimit;
    },
    spawnProgressScale() {
      return 1;
    },
    spawnLoad() {
      return {
        extraEnemiesPerSpawn: 0,
        extraObstaclesPerSpawn: 0,
        extraCollectiblesPerSpawn: 0,
        entityCapPerType: Number.MAX_SAFE_INTEGER
      };
    },
    canSpawnEntity() {
      return true;
    },
    spawnExtras() {},
    pauseAutoResumeMs() {
      return 0;
    },
    getReport() {
      return null;
    }
  };

  const hasRuntimeDeps =
    state &&
    STATES &&
    typeof startRun === "function" &&
    typeof resumeFromTutorial === "function" &&
    typeof resetWorld === "function" &&
    typeof currentLayoutState === "function";

  if (config.enabled && !hasRuntimeDeps) {
    console.warn("[stress] enabled but runtime dependencies are incomplete, disabling stress mode");
    return disabledApi;
  }

  if (!config.enabled) {
    return disabledApi;
  }

  const frameWorkSamples = [];
  const updateSamples = [];
  const renderSamples = [];
  const deltaSamples = [];
  const sectionSamples = new Map();
  const sectionTotals = new Map();
  const eventLog = [];
  const alertHistory = [];
  const activeAlerts = new Map();
  const maxEntities = {
    enemies: 0,
    obstacles: 0,
    collectibles: 0,
    warnings: 0,
    comboPopups: 0,
    activeTravelWindowPx: 0
  };

  let startedAtMs = 0;
  let completedAtMs = 0;
  let processedFrames = 0;
  let overBudgetFrames = 0;
  let droppedFrames = 0;
  let rafSkippedFrames = 0;
  let lastHudUpdateAt = 0;
  let latestCounts = null;
  let report = null;
  let finalized = false;
  let hudNode = null;
  let pauseResumeAtMs = 0;
  const soundEventLastAt = new Map();
  const freezeWindows = [];
  let freezeWindowStartMs = 0;
  let freezeWindowStartDistance = 0;
  let freezeWindowStartFrame = 0;
  let freezeWindowReason = "";
  let freezeWindowActive = false;
  let lastProgressAtMs = 0;
  let lastProgressDistance = 0;
  let maxRunningStallMs = 0;
  let runningStallIgnoreUntilMs = 0;

  const sessionId = `stress-${Math.floor(Date.now())}`;

  function round2(value) {
    return Number(value.toFixed(2));
  }

  function toFixedNumber(value, fallback = 0) {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return round2(value);
  }

  function pushSample(samples, value) {
    if (!Number.isFinite(value)) {
      return;
    }

    samples.push(value);
    if (samples.length > config.maxSamples) {
      samples.shift();
    }
  }

  function pushBounded(list, value, limit) {
    list.push(value);
    if (list.length > limit) {
      list.shift();
    }
  }

  function samplePercentile(samples, percentile) {
    if (!Array.isArray(samples) || samples.length === 0) {
      return 0;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const clampedPercentile = Math.max(0, Math.min(1, percentile));
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * clampedPercentile) - 1));
    return sorted[index];
  }

  function summarizeSamples(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
      return {
        count: 0,
        min: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0
      };
    }

    let total = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const sample of samples) {
      total += sample;
      if (sample < min) {
        min = sample;
      }
      if (sample > max) {
        max = sample;
      }
    }

    return {
      count: samples.length,
      min: toFixedNumber(min),
      avg: toFixedNumber(total / samples.length),
      p50: toFixedNumber(samplePercentile(samples, 0.5)),
      p95: toFixedNumber(samplePercentile(samples, 0.95)),
      p99: toFixedNumber(samplePercentile(samples, 0.99)),
      max: toFixedNumber(max)
    };
  }

  function summarizeSections() {
    const summary = [];
    for (const [name, samples] of sectionSamples.entries()) {
      const stat = summarizeSamples(samples);
      summary.push({
        section: name,
        ...stat,
        totalMs: toFixedNumber(sectionTotals.get(name) || 0)
      });
    }
    summary.sort((a, b) => b.p95 - a.p95 || b.totalMs - a.totalMs || b.max - a.max);
    return summary;
  }

  function logEvent(level, code, message, data = null, { forceConsole = false } = {}) {
    const now = performance.now();
    const relativeMs = startedAtMs > 0 ? Math.max(0, now - startedAtMs) : 0;
    const entry = {
      tMs: toFixedNumber(relativeMs),
      level,
      code,
      message
    };
    if (data && typeof data === "object") {
      entry.data = data;
    }
    pushBounded(eventLog, entry, config.maxEventLog);

    if (!config.logEvents && !forceConsole) {
      return;
    }

    const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
    const logger = console[method] || console.info;
    if (entry.data) {
      logger(`[stress][${code}] ${message}`, entry.data);
    } else {
      logger(`[stress][${code}] ${message}`);
    }
  }

  function toRelativeMs(timestamp) {
    return startedAtMs > 0 ? Math.max(0, timestamp - startedAtMs) : 0;
  }

  function freezeWindowsTotalMs(windows = freezeWindows) {
    return windows.reduce((sum, item) => sum + item.durationMs, 0);
  }

  function isTransitionFreezeReason(reason) {
    return TRANSITION_FREEZE_REASONS.has(reason);
  }

  function summarizeFreezeWindows() {
    const summary = {
      totalCount: freezeWindows.length,
      totalDurationMs: 0,
      inRunCount: 0,
      inRunDurationMs: 0,
      inRunMaxMs: 0,
      transitionCount: 0,
      transitionDurationMs: 0,
      transitionMaxMs: 0
    };

    for (const freezeWindow of freezeWindows) {
      const durationMs = Number.isFinite(freezeWindow?.durationMs) ? freezeWindow.durationMs : 0;
      summary.totalDurationMs += durationMs;

      if (isTransitionFreezeReason(freezeWindow?.reason)) {
        summary.transitionCount += 1;
        summary.transitionDurationMs += durationMs;
        summary.transitionMaxMs = Math.max(summary.transitionMaxMs, durationMs);
      } else {
        summary.inRunCount += 1;
        summary.inRunDurationMs += durationMs;
        summary.inRunMaxMs = Math.max(summary.inRunMaxMs, durationMs);
      }
    }

    summary.totalDurationMs = toFixedNumber(summary.totalDurationMs);
    summary.inRunDurationMs = toFixedNumber(summary.inRunDurationMs);
    summary.inRunMaxMs = toFixedNumber(summary.inRunMaxMs);
    summary.transitionDurationMs = toFixedNumber(summary.transitionDurationMs);
    summary.transitionMaxMs = toFixedNumber(summary.transitionMaxMs);
    return summary;
  }

  function openFreezeWindow(startTimestamp, reason = "running-no-progress") {
    if (freezeWindowActive) {
      return;
    }
    freezeWindowActive = true;
    freezeWindowStartMs = startTimestamp;
    freezeWindowStartDistance = state.distanceTraveled;
    freezeWindowStartFrame = processedFrames;
    freezeWindowReason = reason;
    logEvent("warn", "running-progress-stall", "Running progress stall started", {
      startMs: toFixedNumber(toRelativeMs(startTimestamp)),
      distance: toFixedNumber(state.distanceTraveled),
      reason
    });
  }

  function closeFreezeWindow(endTimestamp, reason = "running-progress-resumed") {
    if (!freezeWindowActive) {
      return;
    }

    const durationMs = Math.max(0, endTimestamp - freezeWindowStartMs);
    const distanceDelta = state.distanceTraveled - freezeWindowStartDistance;
    freezeWindowActive = false;
    if (durationMs < RUNNING_STALL_MIN_MS) {
      return;
    }

    const window = {
      startMs: toFixedNumber(toRelativeMs(freezeWindowStartMs)),
      endMs: toFixedNumber(toRelativeMs(endTimestamp)),
      durationMs: toFixedNumber(durationMs),
      reason,
      openingReason: freezeWindowReason,
      startDistance: toFixedNumber(freezeWindowStartDistance),
      endDistance: toFixedNumber(state.distanceTraveled),
      distanceDelta: toFixedNumber(distanceDelta),
      mode: state.mode,
      isDecelerating: Boolean(state.isDecelerating),
      stalledFrames: Math.max(1, processedFrames - freezeWindowStartFrame + 1)
    };
    pushBounded(freezeWindows, window, FREEZE_WINDOW_LIMIT);
    logEvent("warn", "freeze-window", "Running progress stall ended", window);
  }

  function freezeWindowsWithContext() {
    return freezeWindows.map((window) => {
      const nearbyEvents = eventLog
        .filter((entry) => {
          if (!FREEZE_EVENT_CODES.has(entry.code)) {
            return false;
          }
          return (
            entry.tMs >= window.startMs - FREEZE_CONTEXT_WINDOW_MS &&
            entry.tMs <= window.endMs + FREEZE_CONTEXT_WINDOW_MS
          );
        })
        .slice(-24);
      return {
        ...window,
        classification: isTransitionFreezeReason(window.reason) ? "transition" : "in-run",
        ignoredForRegression: isTransitionFreezeReason(window.reason),
        nearbyEvents
      };
    });
  }

  function trackRunningStall(timestamp) {
    if (!startedAtMs) {
      return;
    }

    const isRunning = state.mode === STATES.running && state.isRunning;
    if (!isRunning) {
      closeFreezeWindow(timestamp, "mode-transition");
      setAlert("running-stall", false, null);
      runningStallIgnoreUntilMs = Math.max(runningStallIgnoreUntilMs, timestamp + RUNNING_STALL_TRANSITION_GRACE_MS);
      lastProgressAtMs = timestamp;
      lastProgressDistance = state.distanceTraveled;
      return;
    }

    const distanceDelta = state.distanceTraveled - lastProgressDistance;
    if (distanceDelta < -RUNNING_STALL_DISTANCE_EPSILON) {
      closeFreezeWindow(timestamp, "distance-reset");
      setAlert("running-stall", false, null);
      runningStallIgnoreUntilMs = Math.max(runningStallIgnoreUntilMs, timestamp + RUNNING_STALL_TRANSITION_GRACE_MS);
      lastProgressAtMs = timestamp;
      lastProgressDistance = state.distanceTraveled;
      return;
    }

    if (timestamp < runningStallIgnoreUntilMs) {
      closeFreezeWindow(timestamp, "transition-grace");
      setAlert("running-stall", false, null);
      lastProgressAtMs = timestamp;
      lastProgressDistance = state.distanceTraveled;
      return;
    }

    if (distanceDelta > RUNNING_STALL_DISTANCE_EPSILON) {
      closeFreezeWindow(timestamp, "distance-resumed");
      setAlert("running-stall", false, null);
      lastProgressAtMs = timestamp;
      lastProgressDistance = state.distanceTraveled;
      return;
    }

    const stallMs = Math.max(0, timestamp - lastProgressAtMs);
    maxRunningStallMs = Math.max(maxRunningStallMs, stallMs);
    if (stallMs < RUNNING_STALL_MIN_MS) {
      return;
    }

    openFreezeWindow(lastProgressAtMs, "running-no-progress");
    setAlert("running-stall", true, {
      message: `Running progress stalled (${toFixedNumber(stallMs)}ms >= ${RUNNING_STALL_MIN_MS}ms)`,
      value: stallMs,
      threshold: RUNNING_STALL_MIN_MS
    });
  }

  function logSoundStartEvent(channel, key, details = null) {
    const now = performance.now();
    const eventKey = `${channel}:${key}`;
    const throttleMs = key === "step" ? 800 : channel === "music" ? 250 : 100;
    const lastAt = soundEventLastAt.get(eventKey) || 0;
    if (now - lastAt < throttleMs) {
      return;
    }
    soundEventLastAt.set(eventKey, now);
    logEvent("info", "sound-start", "Sound start attempted", {
      channel,
      key,
      ...(details && typeof details === "object" ? details : {})
    });
  }

  function ensureHud() {
    if (!config.hud || hudNode) {
      return;
    }

    hudNode = document.createElement("pre");
    hudNode.id = "stress-hud";
    hudNode.style.position = "fixed";
    hudNode.style.left = "10px";
    hudNode.style.top = "10px";
    hudNode.style.zIndex = "2147483647";
    hudNode.style.margin = "0";
    hudNode.style.padding = "8px 10px";
    hudNode.style.borderRadius = "8px";
    hudNode.style.background = "rgba(2, 6, 23, 0.85)";
    hudNode.style.border = "1px solid rgba(148, 163, 184, 0.45)";
    hudNode.style.color = "#e2e8f0";
    hudNode.style.font = "12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    hudNode.style.whiteSpace = "pre";
    hudNode.style.pointerEvents = "none";
    hudNode.style.minWidth = "300px";
    hudNode.style.maxWidth = "min(92vw, 460px)";
    document.body?.appendChild(hudNode);
  }

  function maybeDownloadReport(nextReport) {
    if (!config.downloadReport) {
      return;
    }

    const blob = new Blob([`${JSON.stringify(nextReport, null, 2)}\n`], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `stress-report-${sessionId}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    logEvent("info", "report-download", "Stress report downloaded", {
      filename: anchor.download
    });
  }

  function normalizedActiveAlerts() {
    const now = performance.now();
    const list = [];
    for (const alert of activeAlerts.values()) {
      list.push({
        code: alert.code,
        message: alert.message,
        value: toFixedNumber(alert.value),
        threshold: toFixedNumber(alert.threshold),
        occurrences: alert.occurrences,
        activeForMs: toFixedNumber(now - alert.activeSinceMs)
      });
    }
    list.sort((a, b) => b.activeForMs - a.activeForMs || a.code.localeCompare(b.code));
    return list;
  }

  function setAlert(code, active, payload) {
    const now = performance.now();
    const existing = activeAlerts.get(code);

    if (!active) {
      if (!existing) {
        return;
      }
      activeAlerts.delete(code);
      const event = {
        tMs: toFixedNumber(Math.max(0, now - startedAtMs)),
        code,
        status: "resolved",
        message: existing.message,
        value: toFixedNumber(existing.value),
        threshold: toFixedNumber(existing.threshold),
        activeForMs: toFixedNumber(now - existing.activeSinceMs)
      };
      pushBounded(alertHistory, event, config.maxAlertHistory);
      logEvent("info", "alert-resolved", `${code} resolved`, event, { forceConsole: true });
      return;
    }

    if (!existing) {
      const next = {
        code,
        message: payload.message,
        value: payload.value,
        threshold: payload.threshold,
        activeSinceMs: now,
        lastLogAtMs: now,
        occurrences: 1
      };
      activeAlerts.set(code, next);
      const event = {
        tMs: toFixedNumber(Math.max(0, now - startedAtMs)),
        code,
        status: "triggered",
        message: payload.message,
        value: toFixedNumber(payload.value),
        threshold: toFixedNumber(payload.threshold)
      };
      pushBounded(alertHistory, event, config.maxAlertHistory);
      logEvent("warn", "alert-triggered", payload.message, event, { forceConsole: true });
      return;
    }

    existing.message = payload.message;
    existing.value = payload.value;
    existing.threshold = payload.threshold;
    existing.occurrences += 1;
    if (config.alerts.cooldownMs <= 0 || now - existing.lastLogAtMs >= config.alerts.cooldownMs) {
      existing.lastLogAtMs = now;
      logEvent("warn", "alert-active", payload.message, {
        code,
        value: toFixedNumber(payload.value),
        threshold: toFixedNumber(payload.threshold),
        activeForMs: toFixedNumber(now - existing.activeSinceMs),
        occurrences: existing.occurrences
      });
    }
  }

  function evaluateAlerts(frameSummary, sectionSummary) {
    if (!config.alerts.enabled || frameSummary.count === 0) {
      return;
    }

    const overBudgetRatio = processedFrames > 0 ? (overBudgetFrames / processedFrames) * 100 : 0;
    const hottestSection = sectionSummary[0];
    const hasSectionHotspot =
      Boolean(hottestSection) &&
      hottestSection.count >= 20 &&
      hottestSection.p95 > config.alerts.sectionP95Ms;

    setAlert("frame-p95", frameSummary.count >= 40 && frameSummary.p95 > config.alerts.frameP95Ms, {
      message: `Frame p95 is above threshold (${toFixedNumber(frameSummary.p95)}ms > ${toFixedNumber(config.alerts.frameP95Ms)}ms)`,
      value: frameSummary.p95,
      threshold: config.alerts.frameP95Ms
    });
    setAlert("frame-p99", frameSummary.count >= 40 && frameSummary.p99 > config.alerts.frameP99Ms, {
      message: `Frame p99 is above threshold (${toFixedNumber(frameSummary.p99)}ms > ${toFixedNumber(config.alerts.frameP99Ms)}ms)`,
      value: frameSummary.p99,
      threshold: config.alerts.frameP99Ms
    });
    setAlert("over-budget-share", processedFrames >= 60 && overBudgetRatio > config.alerts.overBudgetPct, {
      message: `Over-budget frame share is high (${toFixedNumber(overBudgetRatio)}% > ${toFixedNumber(config.alerts.overBudgetPct)}%)`,
      value: overBudgetRatio,
      threshold: config.alerts.overBudgetPct
    });
    setAlert("dropped-frames", droppedFrames >= config.alerts.droppedFrames, {
      message: `Dropped frame count reached threshold (${droppedFrames} >= ${config.alerts.droppedFrames})`,
      value: droppedFrames,
      threshold: config.alerts.droppedFrames
    });
    setAlert("section-hotspot", hasSectionHotspot, {
      message: hasSectionHotspot
        ? `Section hotspot: ${hottestSection.section} p95=${toFixedNumber(hottestSection.p95)}ms (limit ${toFixedNumber(config.alerts.sectionP95Ms)}ms)`
        : "Section hotspot resolved",
      value: hasSectionHotspot ? hottestSection.p95 : 0,
      threshold: config.alerts.sectionP95Ms
    });
  }

  function buildSnapshot(timestamp, layoutState) {
    const elapsedMs = Math.max(0, timestamp - startedAtMs);
    const frameSummary = summarizeSamples(frameWorkSamples);
    const updateSummary = summarizeSamples(updateSamples);
    const renderSummary = summarizeSamples(renderSamples);
    const deltaSummary = summarizeSamples(deltaSamples);
    const sectionSummary = summarizeSections();
    const freezeSummary = summarizeFreezeWindows();
    if (!finalized) {
      evaluateAlerts(frameSummary, sectionSummary);
    }
    const fps = deltaSummary.avg > 0 ? 1000 / deltaSummary.avg : 0;
    const overBudgetRatio = processedFrames > 0 ? (overBudgetFrames / processedFrames) * 100 : 0;

    return {
      elapsedMs,
      frameSummary,
      updateSummary,
      renderSummary,
      deltaSummary,
      sectionSummary,
      hottestSection: sectionSummary[0] || null,
      fps,
      overBudgetRatio,
      activeAlerts: normalizedActiveAlerts(),
      triggeredAlertsCount: alertHistory.reduce((count, item) => (item.status === "triggered" ? count + 1 : count), 0),
      freezeWindowCount: freezeSummary.inRunCount,
      freezeTransitionWindowCount: freezeSummary.transitionCount,
      freezeAllWindowCount: freezeSummary.totalCount,
      freezeTotalMs: freezeSummary.inRunDurationMs,
      freezeTransitionMs: freezeSummary.transitionDurationMs,
      freezeAllTotalMs: freezeSummary.totalDurationMs,
      maxRunningStallMs: toFixedNumber(maxRunningStallMs),
      maxInRunStallMs: freezeSummary.inRunMaxMs,
      layoutState
    };
  }

  function updateHud(snapshot) {
    if (!hudNode) {
      return;
    }

    const {
      elapsedMs,
      frameSummary,
      updateSummary,
      renderSummary,
      deltaSummary,
      hottestSection,
      fps,
      overBudgetRatio,
      activeAlerts,
      triggeredAlertsCount,
      freezeWindowCount,
      freezeTransitionWindowCount,
      freezeAllWindowCount,
      freezeTotalMs,
      freezeTransitionMs,
      freezeAllTotalMs,
      maxRunningStallMs,
      maxInRunStallMs,
      layoutState
    } = snapshot;

    const bucket = layoutState?.bucket || "unknown";
    const orientation = layoutState?.orientation || "unknown";
    const viewportLabel = config.viewport ? `${config.viewport.width}x${config.viewport.height}` : "native";
    const topAlertLines = activeAlerts.slice(0, 2).map((alert) => {
      return `! ${alert.code}: ${alert.message}`;
    });

    if (activeAlerts.length > 0) {
      hudNode.style.borderColor = "rgba(248, 113, 113, 0.95)";
      hudNode.style.background = "rgba(69, 10, 10, 0.88)";
    } else {
      hudNode.style.borderColor = "rgba(148, 163, 184, 0.45)";
      hudNode.style.background = "rgba(2, 6, 23, 0.85)";
    }

    hudNode.textContent = [
      `STRESS ${finalized ? "DONE" : "RUN"} ${round2(elapsedMs / 1000)}s / ${round2(config.durationMs / 1000)}s`,
      `viewport=${viewportLabel} bucket=${bucket} ${orientation}`,
      `fps~${toFixedNumber(fps)} overBudget=${toFixedNumber(overBudgetRatio)}% dropped=${droppedFrames} rafSkips=${rafSkippedFrames}`,
      `frame p95=${frameSummary.p95}ms p99=${frameSummary.p99}ms max=${frameSummary.max}ms`,
      `update p95=${updateSummary.p95}ms  render p95=${renderSummary.p95}ms  delta p95=${deltaSummary.p95}ms`,
      `stalls run=${freezeWindowCount}/${freezeTotalMs}ms transition=${freezeTransitionWindowCount}/${freezeTransitionMs}ms all=${freezeAllWindowCount}/${freezeAllTotalMs}ms`,
      `stalls maxAll=${maxRunningStallMs}ms maxRun=${maxInRunStallMs}ms`,
      hottestSection
        ? `hotspot=${hottestSection.section} p95=${hottestSection.p95}ms max=${hottestSection.max}ms`
        : "hotspot=n/a",
      `alerts active=${activeAlerts.length} triggered=${triggeredAlertsCount}`,
      ...topAlertLines,
      `entities max E:${maxEntities.enemies} O:${maxEntities.obstacles} C:${maxEntities.collectibles} W:${maxEntities.warnings} P:${maxEntities.comboPopups}`
    ].join("\n");
  }

  function buildReport(timestamp, layoutState) {
    const snapshot = buildSnapshot(timestamp, layoutState);

    return {
      sessionId,
      completedAt: new Date().toISOString(),
      durationMs: round2(snapshot.elapsedMs),
      config: {
        profile: config.profile,
        durationMs: config.durationMs,
        frameBudgetMs: round2(config.frameBudgetMs),
        autoStart: config.autoStart,
        autoRestart: config.autoRestart,
        invincible: config.invincible,
        infiniteLives: config.infiniteLives,
        pauseAutoResumeMs: config.pauseAutoResumeMs,
        muteAudio: config.muteAudio,
        hud: config.hud,
        logEvents: config.logEvents,
        downloadReport: config.downloadReport,
        maxEventLog: config.maxEventLog,
        maxAlertHistory: config.maxAlertHistory,
        alerts: config.alerts,
        load: config.load,
        viewport: config.viewport
      },
      runtime: {
        userAgent: globalThis.navigator?.userAgent || "unknown",
        devicePixelRatio: globalThis.devicePixelRatio || 1,
        screen: {
          width: globalThis.innerWidth || 0,
          height: globalThis.innerHeight || 0
        },
        layout: {
          bucket: snapshot.layoutState?.bucket || "unknown",
          orientation: snapshot.layoutState?.orientation || "unknown",
          screenAspect: snapshot.layoutState?.metrics?.screenAspect ?? null,
          cameraAspect: snapshot.layoutState?.metrics?.cameraAspect ?? null,
          effectiveAspect: snapshot.layoutState?.metrics?.effectiveAspect ?? null,
          cameraAspectCapped: snapshot.layoutState?.metrics?.cameraAspectCapped ?? null
        }
      },
      summary: {
        processedFrames,
        overBudgetFrames,
        droppedFrames,
        rafSkippedFrames,
        overBudgetSharePct: toFixedNumber(snapshot.overBudgetRatio),
        approxFps: toFixedNumber(snapshot.fps),
        activeAlerts: snapshot.activeAlerts.length,
        triggeredAlerts: snapshot.triggeredAlertsCount,
        freezeWindows: snapshot.freezeWindowCount,
        freezeTotalMs: snapshot.freezeTotalMs,
        transitionFreezeWindows: snapshot.freezeTransitionWindowCount,
        transitionFreezeTotalMs: snapshot.freezeTransitionMs,
        allFreezeWindows: snapshot.freezeAllWindowCount,
        allFreezeTotalMs: snapshot.freezeAllTotalMs,
        maxRunningStallMs: snapshot.maxRunningStallMs
      },
      timings: {
        frame: snapshot.frameSummary,
        update: snapshot.updateSummary,
        render: snapshot.renderSummary,
        delta: snapshot.deltaSummary
      },
      hotspots: snapshot.sectionSummary.slice(0, 8),
      sections: snapshot.sectionSummary,
      maxEntities,
      alerts: {
        active: snapshot.activeAlerts,
        history: alertHistory,
        triggeredCount: snapshot.triggeredAlertsCount,
        thresholds: config.alerts
      },
      freeze: {
        runningStallThresholdMs: RUNNING_STALL_MIN_MS,
        distanceEpsilon: RUNNING_STALL_DISTANCE_EPSILON,
        transitionGraceMs: RUNNING_STALL_TRANSITION_GRACE_MS,
        contextWindowMs: FREEZE_CONTEXT_WINDOW_MS,
        totalWindows: freezeWindows.length,
        totalDurationMs: toFixedNumber(freezeWindowsTotalMs()),
        inRunWindows: snapshot.freezeWindowCount,
        inRunDurationMs: snapshot.freezeTotalMs,
        transitionWindows: snapshot.freezeTransitionWindowCount,
        transitionDurationMs: snapshot.freezeTransitionMs,
        maxRunningStallMs: toFixedNumber(maxRunningStallMs),
        windows: freezeWindowsWithContext()
      },
      logs: eventLog
    };
  }

  function finalize(timestamp, layoutState) {
    if (finalized) {
      return;
    }

    completedAtMs = timestamp;
    closeFreezeWindow(timestamp, "session-end");
    setAlert("running-stall", false, null);
    report = buildReport(timestamp, layoutState);
    finalized = true;
    globalThis.__PLAYABLE_STRESS_REPORT__ = report;
    globalThis.__PLAYABLE_STRESS_EVENTS__ = report.logs;
    maybeDownloadReport(report);
    updateHud(buildSnapshot(timestamp, layoutState));

    logEvent("info", "report-ready", "Stress report is ready", {
      durationMs: report.durationMs,
      processedFrames: report.summary.processedFrames,
      triggeredAlerts: report.summary.triggeredAlerts
    }, { forceConsole: true });
    if (config.logEvents) {
      console.info("[stress] report json", JSON.stringify(report));
    }
  }

  function ensureStarted(timestamp) {
    if (startedAtMs > 0) {
      return;
    }
    startedAtMs = timestamp;
    runningStallIgnoreUntilMs = timestamp + RUNNING_STALL_TRANSITION_GRACE_MS;
    lastProgressAtMs = timestamp;
    lastProgressDistance = state.distanceTraveled;
    maxRunningStallMs = 0;
    ensureHud();
    logEvent("info", "mode-enabled", "Stress mode enabled", {
      profile: config.profile,
      durationMs: config.durationMs,
      frameBudgetMs: config.frameBudgetMs,
      invincible: config.invincible,
      infiniteLives: config.infiniteLives,
      pauseAutoResumeMs: config.pauseAutoResumeMs,
      alerts: config.alerts,
      load: config.load,
      viewport: config.viewport || null
    });
  }

  function currentEntityCount(type) {
    if (type === "enemy") {
      return state.enemies.length;
    }
    if (type === "obstacle") {
      return state.obstacles.length;
    }
    if (type === "collectible") {
      return state.collectibles.length;
    }
    return 0;
  }

  function hasEntityCapacity(type, countToAdd = 1) {
    const load = {
      extraEnemiesPerSpawn: config.load?.extraEnemiesPerSpawn ?? 0,
      extraObstaclesPerSpawn: config.load?.extraObstaclesPerSpawn ?? 0,
      extraCollectiblesPerSpawn: config.load?.extraCollectiblesPerSpawn ?? 0,
      entityCapPerType: config.load?.entityCapPerType ?? Number.MAX_SAFE_INTEGER
    };
    const cap = Number.isFinite(load.entityCapPerType) ? load.entityCapPerType : Number.MAX_SAFE_INTEGER;
    if (cap <= 0) {
      return false;
    }
    return currentEntityCount(type) + countToAdd <= cap;
  }

  function spawnConfiguredExtras(entry, helpers = {}) {
    const load = {
      extraEnemiesPerSpawn: config.load?.extraEnemiesPerSpawn ?? 0,
      extraObstaclesPerSpawn: config.load?.extraObstaclesPerSpawn ?? 0,
      extraCollectiblesPerSpawn: config.load?.extraCollectiblesPerSpawn ?? 0
    };
    const spawnEnemyExtras = Math.max(0, load.extraEnemiesPerSpawn || 0);
    const spawnObstacleExtras = Math.max(0, load.extraObstaclesPerSpawn || 0);
    const spawnCollectibleExtras = Math.max(0, load.extraCollectiblesPerSpawn || 0);

    if (entry.type === "enemy" && spawnEnemyExtras > 0) {
      if (typeof helpers.spawnEnemy !== "function") {
        return;
      }
      for (let index = 0; index < spawnEnemyExtras; index += 1) {
        if (!hasEntityCapacity("enemy")) {
          break;
        }
        const clone = helpers.spawnEnemy();
        if (clone && Number.isFinite(clone.x)) {
          clone.x += 70 + index * 58;
        }
        helpers.perfDebugLogger?.addSpawn?.("enemy");
      }
      return;
    }

    if (entry.type === "obstacle" && spawnObstacleExtras > 0) {
      if (typeof helpers.spawnObstacle !== "function" || typeof helpers.currentGroundY !== "function") {
        return;
      }
      for (let index = 0; index < spawnObstacleExtras; index += 1) {
        if (!hasEntityCapacity("obstacle")) {
          break;
        }
        const clone = helpers.spawnObstacle();
        if (clone && Number.isFinite(clone.x)) {
          clone.x += 56 + index * 44;
        }
        if (clone && Number.isFinite(clone.height)) {
          clone.y = helpers.currentGroundY() - clone.height - (index % 2 === 0 ? 0 : 18);
        }
        if (
          entry.warningLabel &&
          index % 2 === 0 &&
          clone &&
          Number.isFinite(clone.x) &&
          typeof helpers.spawnWarningLabel === "function"
        ) {
          helpers.spawnWarningLabel(clone.x, clone.pulseSeed);
        }
        helpers.perfDebugLogger?.addSpawn?.("obstacle");
      }
      return;
    }

    if (entry.type === "collectible" && spawnCollectibleExtras > 0) {
      if (typeof helpers.spawnCollectible !== "function") {
        return;
      }
      const baseYOffset = entry.yOffset || 0;
      for (let index = 0; index < spawnCollectibleExtras; index += 1) {
        if (!hasEntityCapacity("collectible")) {
          break;
        }
        const offsetWave = (index % 4) * 18;
        helpers.spawnCollectible(baseYOffset + offsetWave);
        const list = helpers.state?.collectibles;
        const clone = Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null;
        if (clone && Number.isFinite(clone.x)) {
          clone.x += 32 + index * 26;
        }
        helpers.perfDebugLogger?.addSpawn?.("collectible");
      }
    }
  }

  return {
    enabled: true,
    config,
    installGlobals(target = globalThis) {
      target.__PLAYABLE_GET_STRESS_REPORT__ = () => this.getReport();
    },
    isInvincible() {
      return Boolean(config.invincible);
    },
    hasInfiniteLives() {
      return Boolean(config.infiniteLives);
    },
    isAudioMuted() {
      return Boolean(config.muteAudio);
    },
    traceGameplayEvent(code, message, data = null, level = "info") {
      if (!code || !message) {
        return;
      }
      logEvent(level, code, message, data);
    },
    recordSoundStart(channel, key, details = null) {
      if (!channel || !key) {
        return;
      }
      logSoundStartEvent(channel, key, details);
    },
    recordSection(name, ms) {
      if (!Number.isFinite(ms) || ms < 0) {
        return;
      }
      let samples = sectionSamples.get(name);
      if (!samples) {
        samples = [];
        sectionSamples.set(name, samples);
      }
      pushSample(samples, ms);
      sectionTotals.set(name, (sectionTotals.get(name) || 0) + ms);
    },
    recordRafSkip(count = 1) {
      const increment = Number.isFinite(count) ? Math.max(1, Math.round(count)) : 1;
      rafSkippedFrames += increment;
    },
    recordFrame({ timestamp, deltaMs, updateMs, renderMs, counts, layoutState }) {
      ensureStarted(timestamp);
      if (finalized) {
        return;
      }

      processedFrames += 1;

      const workMs = updateMs + renderMs;
      pushSample(frameWorkSamples, workMs);
      pushSample(updateSamples, updateMs);
      pushSample(renderSamples, renderMs);
      pushSample(deltaSamples, deltaMs);
      trackRunningStall(timestamp);

      if (workMs > config.frameBudgetMs) {
        overBudgetFrames += 1;
      }
      if (deltaMs > config.frameBudgetMs * 1.5) {
        droppedFrames += 1;
      }

      latestCounts = counts || latestCounts;
      if (latestCounts) {
        maxEntities.enemies = Math.max(maxEntities.enemies, latestCounts.enemies || 0);
        maxEntities.obstacles = Math.max(maxEntities.obstacles, latestCounts.obstacles || 0);
        maxEntities.collectibles = Math.max(maxEntities.collectibles, latestCounts.collectibles || 0);
        maxEntities.warnings = Math.max(maxEntities.warnings, latestCounts.warnings || 0);
        maxEntities.comboPopups = Math.max(maxEntities.comboPopups, latestCounts.comboPopups || 0);
        maxEntities.activeTravelWindowPx = Math.max(maxEntities.activeTravelWindowPx, latestCounts.activeTravelWindowPx || 0);
      }

      if (timestamp - lastHudUpdateAt >= config.hudUpdateMs) {
        lastHudUpdateAt = timestamp;
        updateHud(buildSnapshot(timestamp, layoutState));
      }

      if (timestamp - startedAtMs >= config.durationMs) {
        finalize(timestamp, layoutState);
      }
    },
    ensureAutoProgress() {
      if (!config.autoStart || finalized) {
        return;
      }

      if (state.mode === STATES.loading) {
        return;
      }

      if (state.mode === STATES.intro) {
        startRun({ skipMusic: true });
        return;
      }

      if (state.mode === STATES.paused) {
        if (pauseResumeAtMs <= 0) {
          pauseResumeAtMs = performance.now() + this.pauseAutoResumeMs();
          logEvent("info", "pause-autoresume-armed", "Tutorial pause auto-resume armed", {
            inMs: this.pauseAutoResumeMs()
          });
        }
        if (performance.now() < pauseResumeAtMs) {
          return;
        }
        pauseResumeAtMs = 0;
        resumeFromTutorial("auto-resume");
        return;
      }
      pauseResumeAtMs = 0;

      if (config.autoRestart && (state.mode === STATES.endWin || state.mode === STATES.endLose)) {
        resetWorld();
        startRun({ skipMusic: true });
      }
    },
    onBootReady() {
      ensureHud();
      if (!config.autoStart) {
        return;
      }
      requestAnimationFrame(() => {
        this.ensureAutoProgress();
      });
    },
    shouldBypassLandscapeCap() {
      return Boolean(config.load?.landscapeUncap);
    },
    spawnBurstLimit(baseLimit) {
      const scale = Number.isFinite(config.load?.spawnBurstScale) ? config.load.spawnBurstScale : 1;
      return Math.max(1, Math.round(baseLimit * Math.max(1, scale)));
    },
    spawnProgressScale() {
      return Number.isFinite(config.load?.spawnDistanceScale) ? config.load.spawnDistanceScale : 1;
    },
    spawnLoad() {
      return {
        extraEnemiesPerSpawn: config.load?.extraEnemiesPerSpawn ?? 0,
        extraObstaclesPerSpawn: config.load?.extraObstaclesPerSpawn ?? 0,
        extraCollectiblesPerSpawn: config.load?.extraCollectiblesPerSpawn ?? 0,
        entityCapPerType: config.load?.entityCapPerType ?? Number.MAX_SAFE_INTEGER
      };
    },
    canSpawnEntity(type, countToAdd = 1) {
      return hasEntityCapacity(type, countToAdd);
    },
    spawnExtras(entry, helpers = {}) {
      spawnConfiguredExtras(entry, helpers);
    },
    pauseAutoResumeMs() {
      return Number.isFinite(config.pauseAutoResumeMs) ? Math.max(0, config.pauseAutoResumeMs) : 0;
    },
    getReport() {
      if (report) {
        return report;
      }
      if (!startedAtMs) {
        return null;
      }
      return buildReport(completedAtMs || performance.now(), currentLayoutState());
    }
  };
}
