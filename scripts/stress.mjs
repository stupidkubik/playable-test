import { spawn } from "node:child_process";
import process from "node:process";

function envNumber(name, fallback, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE } = {}) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function envBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function envOptionalNumber(name, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE } = {}) {
  const raw = process.env[name];
  if (raw === undefined) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(max, Math.max(min, parsed));
}

const host = process.env.STRESS_HOST || process.env.HOST || "127.0.0.1";
const profileRaw = (process.env.STRESS_PROFILE || "default").trim().toLowerCase();
const profile = profileRaw === "heavy" ? "heavy" : "default";
const heavyProfile = profile === "heavy";
const port = envNumber("STRESS_PORT", envNumber("PORT", 5173, { min: 1, max: 65535 }), { min: 1, max: 65535 });
const width = Math.round(envNumber("STRESS_VIEWPORT_W", 932, { min: 240, max: 4000 }));
const height = Math.round(envNumber("STRESS_VIEWPORT_H", 430, { min: 180, max: 4000 }));
const durationSec = envNumber("STRESS_DURATION_SEC", heavyProfile ? 150 : 90, { min: 10, max: 900 });
const frameBudgetMs = envNumber("STRESS_FRAME_BUDGET_MS", 1000 / 60, { min: 8, max: 80 });
const muteAudio = envBoolean("STRESS_MUTE_AUDIO", true);
const autoRestart = envBoolean("STRESS_AUTO_RESTART", true);
const invincible = envBoolean("STRESS_INVINCIBLE", false);
const infiniteLives = envBoolean("STRESS_INFINITE_LIVES", true);
const pauseAutoResumeSec = envNumber("STRESS_PAUSE_AUTO_RESUME_SEC", 2, { min: 0.2, max: 30 });
const downloadReport = envBoolean("STRESS_DOWNLOAD_REPORT", true);
const stressLog = envBoolean("STRESS_LOG", true);
const stressAlerts = envBoolean("STRESS_ALERTS", true);
const alertFrameP95Ms = envOptionalNumber("STRESS_ALERT_FRAME_P95_MS", { min: 1, max: 300 });
const alertFrameP99Ms = envOptionalNumber("STRESS_ALERT_FRAME_P99_MS", { min: 1, max: 600 });
const alertSectionP95Ms = envOptionalNumber("STRESS_ALERT_SECTION_P95_MS", { min: 1, max: 120 });
const alertOverBudgetPct = envOptionalNumber("STRESS_ALERT_OVER_BUDGET_PCT", { min: 1, max: 100 });
const alertDroppedFrames = envOptionalNumber("STRESS_ALERT_DROPPED_FRAMES", { min: 1, max: 5000 });
const landscapeUncap = envBoolean("STRESS_LANDSCAPE_UNCAP", heavyProfile);
const spawnBurstScale = envNumber("STRESS_SPAWN_BURST_SCALE", heavyProfile ? 4 : 1, { min: 1, max: 12 });
const spawnDistanceScale = envNumber("STRESS_SPAWN_DISTANCE_SCALE", heavyProfile ? 2.2 : 1, { min: 0.25, max: 8 });
const extraEnemies = Math.round(envNumber("STRESS_EXTRA_ENEMIES", heavyProfile ? 2 : 0, { min: 0, max: 24 }));
const extraObstacles = Math.round(envNumber("STRESS_EXTRA_OBSTACLES", heavyProfile ? 2 : 0, { min: 0, max: 24 }));
const extraCollectibles = Math.round(envNumber("STRESS_EXTRA_COLLECTIBLES", heavyProfile ? 4 : 0, { min: 0, max: 40 }));
const entityCap = Math.round(envNumber("STRESS_ENTITY_CAP", heavyProfile ? 220 : 180, { min: 10, max: 2000 }));

const query = new URLSearchParams({
  stress: "1",
  stressProfile: profile,
  stressHud: "1",
  stressAutoStart: "1",
  stressAutoRestart: autoRestart ? "1" : "0",
  stressInvincible: invincible ? "1" : "0",
  stressInfiniteLives: infiniteLives ? "1" : "0",
  stressPauseAutoResumeMs: String(Math.round(pauseAutoResumeSec * 1000)),
  stressMuteAudio: muteAudio ? "1" : "0",
  stressDownloadReport: downloadReport ? "1" : "0",
  stressLog: stressLog ? "1" : "0",
  stressAlerts: stressAlerts ? "1" : "0",
  stressDurationSec: String(durationSec),
  stressFrameBudgetMs: String(frameBudgetMs),
  stressLandscapeUncap: landscapeUncap ? "1" : "0",
  stressSpawnBurstScale: String(spawnBurstScale),
  stressSpawnDistanceScale: String(spawnDistanceScale),
  stressExtraEnemies: String(extraEnemies),
  stressExtraObstacles: String(extraObstacles),
  stressExtraCollectibles: String(extraCollectibles),
  stressEntityCap: String(entityCap),
  stressViewport: `${width}x${height}`
});

if (alertFrameP95Ms !== null) {
  query.set("stressAlertFrameP95Ms", String(alertFrameP95Ms));
}
if (alertFrameP99Ms !== null) {
  query.set("stressAlertFrameP99Ms", String(alertFrameP99Ms));
}
if (alertSectionP95Ms !== null) {
  query.set("stressAlertSectionP95Ms", String(alertSectionP95Ms));
}
if (alertOverBudgetPct !== null) {
  query.set("stressAlertOverBudgetPct", String(alertOverBudgetPct));
}
if (alertDroppedFrames !== null) {
  query.set("stressAlertDroppedFrames", String(Math.round(alertDroppedFrames)));
}

const stressUrl = `http://${host}:${port}/?${query.toString()}`;

console.log(`[stress] Starting dev server on http://${host}:${port}`);

const child = spawn(process.execPath, ["scripts/dev-server.mjs"], {
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port)
  },
  stdio: ["inherit", "pipe", "pipe"]
});

let announced = false;

function announceOnce() {
  if (announced) {
    return;
  }
  announced = true;
  console.log("");
  console.log(`[stress] Profile: ${profile}`);
  console.log(`[stress] Open URL: ${stressUrl}`);
  console.log("[stress] Live report API: window.__PLAYABLE_GET_STRESS_REPORT__()");
  console.log("[stress] JSON report object: window.__PLAYABLE_STRESS_REPORT__");
  console.log("[stress] Events log object: window.__PLAYABLE_STRESS_EVENTS__");
  console.log("[stress] Stop with Ctrl+C");
  console.log("");
}

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  if (text.includes("Dev server running at")) {
    announceOnce();
  }
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk.toString());
});

function shutdown(signal = "SIGTERM") {
  if (child.killed) {
    return;
  }
  child.kill(signal);
}

process.on("SIGINT", () => {
  shutdown("SIGTERM");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
