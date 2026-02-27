// Unified images map for build-time inlining and compatibility imports.
import { ASSET_IMAGES_CRITICAL } from "./imagesCritical.js";
import { ASSET_IMAGES_DEFERRED } from "./imagesDeferred.js";

export const ASSET_IMAGES = {
  ...ASSET_IMAGES_CRITICAL,
  ...ASSET_IMAGES_DEFERRED
};
