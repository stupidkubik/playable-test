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
const uiEffectsPath = path.resolve(rootDir, "src/uiEffects.js");
const renderersDir = path.resolve(rootDir, "src/renderers");
const gamePath = path.resolve(rootDir, "src/game.js");
const pixiPath = path.resolve(rootDir, "node_modules/pixi.js/dist/pixi.min.js");
const outputPath = path.resolve(distDir, "playable.html");

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

const [indexHtml, css, ...restSources] = await Promise.all([
  fs.readFile(indexPath, "utf8"),
  fs.readFile(cssPath, "utf8"),
  fs.readFile(logicPath, "utf8"),
  fs.readFile(uiEffectsPath, "utf8"),
  fs.readFile(pixiPath, "utf8"),
  ...rendererPaths.map((filePath) => fs.readFile(filePath, "utf8")),
  fs.readFile(gamePath, "utf8")
]);
const [logic, uiEffects, pixiRuntime, ...sources] = restSources;
const game = sources.pop();
const rendererSources = sources;

const stripLocalImports = (source) =>
  source
    // Remove relative imports, including multiline named imports.
    .replace(/^\s*import[\s\S]*?\sfrom\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "")
    // Remove side-effect relative imports (rare, but safe to support).
    .replace(/^\s*import\s+["'](?:\.\.\/|\.\/)[^"']+["'];?\s*$/gm, "");
const cleanedUiEffects = stripLocalImports(uiEffects);
const cleanedRendererSources = rendererSources.map(stripLocalImports);
const cleanedGame = stripLocalImports(game);
const assetModulesSource = serializeAssetModulesSource({
  images: imagesModule.ASSET_IMAGES,
  audio: audioModule.ASSET_AUDIO,
  frames: framesModule.ASSET_FRAMES
});
const escapeInlineScript = (source) => source.replace(/<\/script>/gi, "<\\/script>");
const bundleParts = [
  compactJsSourceLite(assetModulesSource),
  compactJsSourceLite(logic),
  compactJsSourceLite(cleanedUiEffects),
  ...cleanedRendererSources.map(compactJsSourceLite),
  compactJsSourceLite(cleanedGame)
];
const bundle = bundleParts.join("\n").replace(/export\s+/g, "");
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

const stat = await fs.stat(outputPath);
const sizeBytes = stat.size;
const sizeKb = (sizeBytes / 1024).toFixed(1);
const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
console.log(`Built ${outputPath}`);
console.log(`Bundle size: ${sizeBytes} bytes (${sizeKb} KB)`);
console.log(`Bundle size: ${sizeMb} MB`);
