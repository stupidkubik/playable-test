import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");

const indexPath = path.resolve(rootDir, "index.html");
const cssPath = path.resolve(rootDir, "src/style.css");
const assetsDir = path.resolve(rootDir, "src/assets");
const assetsEntryPath = path.resolve(assetsDir, "playableAssets.js");
const logicPath = path.resolve(rootDir, "src/gameLogic.js");
const layoutEnginePath = path.resolve(rootDir, "src/layout/layoutEngine.js");
const viewportPath = path.resolve(rootDir, "src/viewport.js");
const uiEffectsPath = path.resolve(rootDir, "src/uiEffects.js");
const renderersDir = path.resolve(rootDir, "src/renderers");
const gamePath = path.resolve(rootDir, "src/game.js");
const pixiPath = path.resolve(rootDir, "node_modules/pixi.js/dist/pixi.min.js");
const outputPath = path.resolve(distDir, "playable.html");
const serviceWorkerPath = path.resolve(rootDir, "service-worker.js");
const outputServiceWorkerPath = path.resolve(distDir, "service-worker.js");

await fs.access(assetsEntryPath).catch(() => {
  throw new Error(
    `Не найден локальный asset bundle: ${path.relative(rootDir, assetsEntryPath)}.\n` +
      "Ожидается, что ассеты уже локализованы в проекте (`src/assets/*`). " +
      "Если файлы были удалены, восстановите их из git."
  );
});

const rendererFiles = await fs
  .readdir(renderersDir)
  .then((entries) => entries.filter((entry) => entry.endsWith(".js")).sort())
  .catch(() => []);

const rendererPaths = rendererFiles.map((file) => path.resolve(renderersDir, file));

function stripCommentOnlyLines(source) {
  return source.replace(/^[ \t]*\/\/.*$/gm, "");
}

function compactJsSourceLite(source) {
  return stripCommentOnlyLines(source)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function minifyCssLite(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyHtmlLite(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

const MIME_BY_EXT = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"]
]);

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT.get(ext) || "application/octet-stream";
}

function resolveAssetPath(value) {
  if (typeof value !== "string" || value.startsWith("data:")) {
    return null;
  }

  if (value.startsWith("file://")) {
    return fileURLToPath(value);
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return null;
  }

  if (value.startsWith("/")) {
    return path.resolve(rootDir, `.${value}`);
  }

  return path.resolve(rootDir, value);
}

async function inlineAssetValue(value) {
  const assetPath = resolveAssetPath(value);
  if (!assetPath) {
    return value;
  }

  const bytes = await fs.readFile(assetPath);
  const mime = mimeForPath(assetPath);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function inlineAssetMaps(images, audio) {
  const imageEntries = await Promise.all(
    Object.entries(images || {}).map(async ([key, value]) => [key, await inlineAssetValue(value)])
  );

  const audioEntries = await Promise.all(
    Object.entries(audio || {}).map(async ([key, config]) => {
      const url = await inlineAssetValue(config?.url);
      return [
        key,
        {
          ...config,
          url
        }
      ];
    })
  );

  return {
    images: Object.fromEntries(imageEntries),
    audio: Object.fromEntries(audioEntries)
  };
}

function serializeAssetModulesSource({ images, audio, frames }) {
  return [
    `const ASSET_IMAGES=${JSON.stringify(images)};`,
    `const ASSET_AUDIO=${JSON.stringify(audio)};`,
    `const ASSET_FRAMES=${JSON.stringify(frames)};`,
    "const ASSETS={images:ASSET_IMAGES,audio:ASSET_AUDIO,frames:ASSET_FRAMES};"
  ].join("\n");
}

const [imagesModule, audioModule, framesModule] = await Promise.all([
  import(pathToFileURL(path.resolve(assetsDir, "images.js")).href),
  import(pathToFileURL(path.resolve(assetsDir, "audio.js")).href),
  import(pathToFileURL(path.resolve(assetsDir, "frames.js")).href)
]);

const inlinedAssets = await inlineAssetMaps(imagesModule.ASSET_IMAGES, audioModule.ASSET_AUDIO);

const [indexHtml, css, ...restSources] = await Promise.all([
  fs.readFile(indexPath, "utf8"),
  fs.readFile(cssPath, "utf8"),
  fs.readFile(logicPath, "utf8"),
  fs.readFile(layoutEnginePath, "utf8"),
  fs.readFile(viewportPath, "utf8"),
  fs.readFile(uiEffectsPath, "utf8"),
  fs.readFile(pixiPath, "utf8"),
  ...rendererPaths.map((filePath) => fs.readFile(filePath, "utf8")),
  fs.readFile(gamePath, "utf8")
]);
const [logic, layoutEngine, viewport, uiEffects, pixiRuntime, ...sources] = restSources;
const game = sources.pop();
const rendererSources = sources;

const stripLocalImports = (source) =>
  source
    // Remove relative imports, including multiline named imports.
    .replace(/^\s*import[\s\S]*?\sfrom\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "")
    // Remove side-effect relative imports (rare, but safe to support).
    .replace(/^\s*import\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "")
    // Remove relative re-export lines to avoid dangling `from "./..."` after export stripping.
    .replace(/^\s*export\s+\{[^}]+\}\s+from\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+\*\s+from\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "");
const cleanedUiEffects = stripLocalImports(uiEffects);
const cleanedLayoutEngine = stripLocalImports(layoutEngine);
const cleanedViewport = stripLocalImports(viewport);
const cleanedRendererSources = rendererSources.map(stripLocalImports);
const cleanedGame = stripLocalImports(game);
const assetModulesSource = serializeAssetModulesSource({
  images: inlinedAssets.images,
  audio: inlinedAssets.audio,
  frames: framesModule.ASSET_FRAMES
});
const escapeInlineScript = (source) => source.replace(/<\/script>/gi, "<\\/script>");
const bundleParts = [
  compactJsSourceLite(assetModulesSource),
  compactJsSourceLite(logic),
  compactJsSourceLite(cleanedLayoutEngine),
  compactJsSourceLite(cleanedViewport),
  compactJsSourceLite(cleanedUiEffects),
  ...cleanedRendererSources.map(compactJsSourceLite),
  compactJsSourceLite(cleanedGame)
];
const bundle = bundleParts
  .join("\n")
  .replace(/export\s+/g, "")
  .replace(/^\s*\{[^}]+\}\s+from\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "")
  .replace(/^\s*\*\s+from\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "");
const inlinedPixi = escapeInlineScript(pixiRuntime);
const inlinedBundle = escapeInlineScript(bundle);

let html = indexHtml;
html = html.replace(
  '<link rel="stylesheet" href="./src/style.css" />',
  `<style>${minifyCssLite(css)}</style>`
);
html = html.replace('<script type="module" src="./src/game.js"></script>', () => {
  return `<script>\n${inlinedPixi}\n</script>\n<script type="module">\n${inlinedBundle}\n</script>`;
});
html = minifyHtmlLite(html);

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(outputPath, html, "utf8");
await fs.copyFile(serviceWorkerPath, outputServiceWorkerPath);

const stat = await fs.stat(outputPath);
const sizeBytes = stat.size;
const sizeKb = (sizeBytes / 1024).toFixed(1);
const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
console.log(`Built ${outputPath}`);
console.log(`Copied ${outputServiceWorkerPath}`);
console.log(`Bundle size: ${sizeBytes} bytes (${sizeKb} KB)`);
console.log(`Bundle size: ${sizeMb} MB`);
