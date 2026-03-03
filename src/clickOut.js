const CLICKOUT_DEBOUNCE_MS = 500;
const MRAID_LOADING_STATE = "loading";
const MRAID_READY_STATES = new Set(["default", "expanded", "resized", "hidden"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeUrl(value) {
  if (!isNonEmptyString(value)) {
    return "";
  }

  return value.trim();
}

function readClickTagUrl() {
  const directCandidates = [
    globalThis.clickTag,
    globalThis.clickTag1,
    globalThis.clickTag0,
    globalThis.CLICKTAG
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const clickTags = globalThis.clickTags;
  if (clickTags && typeof clickTags === "object") {
    const orderedKeys = ["default", "clickTag", "clickTag1", "clickTag0"];
    for (const key of orderedKeys) {
      const normalized = normalizeUrl(clickTags[key]);
      if (normalized) {
        return normalized;
      }
    }

    for (const value of Object.values(clickTags)) {
      const normalized = normalizeUrl(value);
      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
}

function readTargetUrl(fallbackUrl) {
  const clickTagUrl = readClickTagUrl();
  if (clickTagUrl) {
    return clickTagUrl;
  }

  return normalizeUrl(fallbackUrl);
}

function readMraidState(mraid) {
  if (!mraid || typeof mraid.getState !== "function") {
    return "";
  }

  try {
    return mraid.getState() || "";
  } catch {
    return "";
  }
}

function isMraidReadyState(state) {
  return MRAID_READY_STATES.has(state);
}

function tryMraidOpen(url) {
  const mraid = globalThis.mraid;
  if (!mraid || typeof mraid.open !== "function") {
    return false;
  }

  const state = readMraidState(mraid);
  if (state && (state === MRAID_LOADING_STATE || !isMraidReadyState(state))) {
    return false;
  }

  try {
    mraid.open(url);
    return true;
  } catch {
    return false;
  }
}

function tryEnablerOpen(url) {
  const enabler = globalThis.Enabler;
  if (!enabler || typeof enabler !== "object") {
    return false;
  }

  if (typeof enabler.exitOverride === "function") {
    try {
      enabler.exitOverride("CTA", url);
      return true;
    } catch {
      // Try other methods.
    }
  }

  if (typeof enabler.exit === "function") {
    try {
      enabler.exit("CTA");
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function tryExitApiOpen() {
  const exitApi = globalThis.ExitApi;
  if (!exitApi || typeof exitApi.exit !== "function") {
    return false;
  }

  try {
    exitApi.exit();
    return true;
  } catch {
    return false;
  }
}

function tryLocationOpen(url) {
  if (!globalThis.location || typeof globalThis.location.assign !== "function") {
    return false;
  }

  try {
    globalThis.location.assign(url);
    return true;
  } catch {
    return false;
  }
}

export function createClickOutHandler({ fallbackUrl } = {}) {
  let lastOpenAt = 0;

  return function openClickOut() {
    const targetUrl = readTargetUrl(fallbackUrl);
    if (!targetUrl) {
      return false;
    }

    const now = Date.now();
    if (now - lastOpenAt < CLICKOUT_DEBOUNCE_MS) {
      return false;
    }

    const opened =
      tryMraidOpen(targetUrl) ||
      tryEnablerOpen(targetUrl) ||
      tryExitApiOpen() ||
      tryLocationOpen(targetUrl);

    if (opened) {
      lastOpenAt = now;
    }

    return opened;
  };
}

