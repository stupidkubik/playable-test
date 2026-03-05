import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const bundlePath = path.resolve(rootDir, "dist/playable.html");
const MAX_BUNDLE_BYTES = 5 * 1024 * 1024;

const FORBIDDEN_PATTERNS = [
  {
    name: "Pixi CDN transcoder URL",
    pattern: /cdn\.jsdelivr\.net\/npm\/pixi\.js\/transcoders\//i
  },
  {
    name: "Runtime Pixi node_modules path fallback",
    pattern: /node_modules\/pixi\.js\/dist\/pixi\.min\.js/i
  },
  {
    name: "Service worker runtime registration",
    pattern: /register\(\"\.\/service-worker\.js\"\)/i
  },
  {
    name: "Deferred asset dynamic import fallback",
    pattern: /import\(\"\.\/assets\/(imagesCritical|imagesDeferred|audioMusic|audioSfx)\.js\"\)/i
  }
];

async function main() {
  const html = await fs.readFile(bundlePath, "utf8");
  const sizeBytes = Buffer.byteLength(html, "utf8");

  if (sizeBytes > MAX_BUNDLE_BYTES) {
    const sizeMb = (sizeBytes / 1024 / 1024).toFixed(3);
    throw new Error(
      `playable.html is too large: ${sizeBytes} bytes (${sizeMb} MB), limit is ${MAX_BUNDLE_BYTES} bytes (5.000 MB)`
    );
  }

  const violations = [];
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(html)) {
      violations.push(rule.name);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `playable.html contains forbidden runtime references:\n- ${violations.join("\n- ")}`
    );
  }

  const sizeKb = (sizeBytes / 1024).toFixed(1);
  const sizeMb = (sizeBytes / 1024 / 1024).toFixed(3);
  console.log(`[verify-playable] OK: ${sizeBytes} bytes (${sizeKb} KB, ${sizeMb} MB)`);
}

main().catch((error) => {
  console.error(`[verify-playable] FAILED: ${error.message}`);
  process.exitCode = 1;
});
