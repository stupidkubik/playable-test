import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");

const indexPath = path.resolve(rootDir, "index.html");
const cssPath = path.resolve(rootDir, "src/style.css");
const assetsPath = path.resolve(rootDir, "src/assets/extractedAssets.js");
const logicPath = path.resolve(rootDir, "src/gameLogic.js");
const gamePath = path.resolve(rootDir, "src/game.js");
const outputPath = path.resolve(distDir, "playable.html");

const [indexHtml, css, assets, logic, game] = await Promise.all([
  fs.readFile(indexPath, "utf8"),
  fs.readFile(cssPath, "utf8"),
  fs.readFile(assetsPath, "utf8"),
  fs.readFile(logicPath, "utf8"),
  fs.readFile(gamePath, "utf8")
]);

const cleanedGame = game.replace(/^import\s+.+?from\s+"\.\/[^"]+";\s*$/gm, "");
const bundle = `${assets}\n\n${logic}\n\n${cleanedGame}`.replace(/export\s+/g, "");

let html = indexHtml;
html = html.replace('<link rel="stylesheet" href="./src/style.css" />', `<style>\n${css}\n</style>`);
html = html.replace(
  '<script type="module" src="./src/game.js"></script>',
  `<script type="module">\n${bundle}\n</script>`
);

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(outputPath, html, "utf8");

const stat = await fs.stat(outputPath);
const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
console.log(`Built ${outputPath}`);
console.log(`Bundle size: ${sizeMb} MB`);
