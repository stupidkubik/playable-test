// Unified audio map for build-time inlining and compatibility imports.
import { ASSET_AUDIO_MUSIC } from "./audioMusic.js";
import { ASSET_AUDIO_SFX } from "./audioSfx.js";

export const ASSET_AUDIO = {
  ...ASSET_AUDIO_MUSIC,
  ...ASSET_AUDIO_SFX
};
