import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const distPlayablePath = path.join(rootDir, "dist", "playable.html");
const pagesArtifactDir = path.join(rootDir, "dist", "pages");
const pagesIndexPath = path.join(pagesArtifactDir, "index.html");
const pagesNoJekyllPath = path.join(pagesArtifactDir, ".nojekyll");

async function assertFileExists(filePath, hintScript) {
  await fs.access(filePath).catch((error) => {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Не найден ${path.relative(rootDir, filePath)}. Сначала запустите ${hintScript}.`
      );
    }
    throw error;
  });
}

async function main() {
  await assertFileExists(distPlayablePath, "npm run build");

  const playableHtml = await fs.readFile(distPlayablePath, "utf8");

  await fs.rm(pagesArtifactDir, { recursive: true, force: true });
  await fs.mkdir(pagesArtifactDir, { recursive: true });
  await fs.writeFile(pagesIndexPath, playableHtml, "utf8");
  await fs.writeFile(pagesNoJekyllPath, "", "utf8");

  console.log(`Prepared ${path.relative(rootDir, pagesIndexPath)} for GitHub Pages`);
  console.log(`Prepared ${path.relative(rootDir, pagesNoJekyllPath)} for GitHub Pages`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
