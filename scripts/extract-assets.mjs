import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.resolve(rootDir, "file.html");
const outputPath = path.resolve(rootDir, "src/assets/extractedAssets.js");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findDataUri(source, variableName) {
  const pattern = new RegExp(`\\b${escapeRegExp(variableName)}\\s*=\\s*\"(data:[^\"]+)\"`);
  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Unable to locate data URI for variable: ${variableName}`);
  }

  return match[1];
}

function findFrame(source, frameName) {
  const pattern = new RegExp(
    `${escapeRegExp(frameName)}\\s*:\\s*\\{\\s*frame\\s*:\\s*\\{\\s*x\\s*:\\s*(\\d+)\\s*,\\s*y\\s*:\\s*(\\d+)\\s*,\\s*w\\s*:\\s*(\\d+)\\s*,\\s*h\\s*:\\s*(\\d+)`
  );

  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Unable to locate frame data: ${frameName}`);
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    w: Number(match[3]),
    h: Number(match[4])
  };
}

const source = await fs.readFile(sourcePath, "utf8");

const assets = {
  images: {
    playerSheet: findDataUri(source, "_S"),
    enemySheet: findDataUri(source, "rq"),
    failBanner: findDataUri(source, "Dq"),
    tutorialHand: findDataUri(source, "Yq"),
    hudCounter: findDataUri(source, "Oq"),
    collectibleIcon: findDataUri(source, "Mp"),
    backdropPortrait: findDataUri(source, "Fl"),
    backdropLandscape: findDataUri(source, "Kl"),
    sceneBackground: findDataUri(source, "gq"),
    sceneTreeLeft: findDataUri(source, "Eq"),
    sceneTreeRight: findDataUri(source, "Vq"),
    sceneBushLarge: findDataUri(source, "qq"),
    sceneBushSmall: findDataUri(source, "Sq"),
    sceneLamp: findDataUri(source, "Mq")
  },
  audio: {
    jump: {
      url: findDataUri(source, "Bq"),
      volume: 0.5
    },
    hit: {
      url: findDataUri(source, "Nq"),
      volume: 0.6
    },
    collect: {
      url: findDataUri(source, "wq"),
      volume: 0.35
    }
  },
  frames: {
    playerIdle: Array.from({ length: 18 }, (_, index) => findFrame(source, `idle_${index}`)),
    playerRun: Array.from({ length: 8 }, (_, index) => findFrame(source, `run_${index}`)),
    playerJump: Array.from({ length: 10 }, (_, index) => findFrame(source, `jump_${index}`)),
    playerHurt: Array.from({ length: 5 }, (_, index) => findFrame(source, `hurt_${index}`)),
    enemyRun: Array.from({ length: 14 }, (_, index) => findFrame(source, `frame_${index}`))
  }
};

const fileContent = `export const ASSETS = ${JSON.stringify(assets, null, 2)};\n`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, fileContent, "utf8");

const stat = await fs.stat(outputPath);
console.log(`Generated ${outputPath}`);
console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB`);
