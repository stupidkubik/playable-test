import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const distPlayablePath = path.join(rootDir, "dist", "playable.html");
const docsPlayableDir = path.join(rootDir, "docs", "playable");
const docsPlayableIndexPath = path.join(docsPlayableDir, "index.html");

async function main() {
  const playableHtml = await fs.readFile(distPlayablePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Не найден ${path.relative(rootDir, distPlayablePath)}. Сначала запустите npm run build.`
      );
    }
    throw error;
  });

  await fs.mkdir(docsPlayableDir, { recursive: true });
  await fs.writeFile(docsPlayableIndexPath, playableHtml, "utf8");

  console.log(`Prepared ${path.relative(rootDir, docsPlayableIndexPath)} for GitHub Pages`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
