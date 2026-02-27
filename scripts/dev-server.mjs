import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";

const mimeByExt = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"]
]);

const cacheableAssetExt = new Set([
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a"
]);

function resolvePath(urlPath) {
  const clean = urlPath.split("?")[0].split("#")[0];
  const requested = clean === "/" ? "/index.html" : clean;
  const absolute = path.resolve(rootDir, `.${requested}`);

  if (!absolute.startsWith(rootDir)) {
    return null;
  }

  return absolute;
}

const server = http.createServer(async (req, res) => {
  try {
    const targetPath = resolvePath(req.url || "/");

    if (!targetPath) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    const content = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();

    res.setHeader("Content-Type", mimeByExt.get(ext) || "application/octet-stream");
    res.setHeader(
      "Cache-Control",
      cacheableAssetExt.has(ext) ? "public, max-age=31536000, immutable" : "no-cache"
    );
    res.statusCode = 200;
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Dev server running at http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error(`Dev server failed to start: ${error.message}`);
  process.exitCode = 1;
});
