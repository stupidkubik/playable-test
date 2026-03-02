function defaultStressConfig() {
  return {
    enabled: false,
    profile: "default",
    heavyProfile: false,
    durationMs: 90_000,
    frameBudgetMs: 1000 / 60,
    hud: false,
    autoStart: false,
    autoRestart: false,
    invincible: false,
    infiniteLives: false,
    pauseAutoResumeMs: 0,
    muteAudio: false,
    hudUpdateMs: 1000,
    maxSamples: 12000,
    downloadReport: false,
    logEvents: false,
    maxEventLog: 600,
    maxAlertHistory: 200,
    alerts: {
      enabled: false,
      cooldownMs: 2500,
      frameP95Ms: 20,
      frameP99Ms: 28,
      sectionP95Ms: 4,
      overBudgetPct: 22,
      droppedFrames: 12
    },
    load: {
      landscapeUncap: false,
      spawnBurstScale: 1,
      spawnDistanceScale: 1,
      extraEnemiesPerSpawn: 0,
      extraObstaclesPerSpawn: 0,
      extraCollectiblesPerSpawn: 0,
      entityCapPerType: Number.MAX_SAFE_INTEGER
    },
    viewport: null
  };
}

function mergeStressConfig(config = {}) {
  const defaults = defaultStressConfig();
  const next = {
    ...defaults,
    ...config,
    alerts: {
      ...defaults.alerts,
      ...(config.alerts || {})
    },
    load: {
      ...defaults.load,
      ...(config.load || {})
    }
  };

  return next;
}

export function readStressConfig() {
  return defaultStressConfig();
}

export function applyStressViewportOverride() {}

export function createStressMode(config = {}, deps = {}) {
  void deps;
  const mergedConfig = mergeStressConfig(config);

  return {
    enabled: false,
    config: mergedConfig,
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
}
