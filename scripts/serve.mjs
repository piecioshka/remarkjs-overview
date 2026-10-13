// Minimal static server for the demo and the tests (`npm start`).
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT) || 4400;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

async function resolveFile(url) {
  const path = normalize(decodeURIComponent(new URL(url, "http://x").pathname));
  const file = join(root, path);
  if (!file.startsWith(root)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return join(file, "index.html");
  return info ? file : null;
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url);
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file)
    .on("error", () => response.end())
    .pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}/demo/`);
});
