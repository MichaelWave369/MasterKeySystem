// Serve the built site exactly where GitHub Pages publishes project sites:
// /MasterKeySystem/index.html and /MasterKeySystem/assets/*.
//
// Vite's default local preview serves dist/ at /, which returns 404 for
// project-prefixed assets and makes Pages browser tests misleading.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const prefix = "/MasterKeySystem/";
const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname); }
  catch { response.writeHead(400); response.end("Bad request"); return; }

  if (!pathname.startsWith(prefix)) {
    response.writeHead(404); response.end("Not found"); return;
  }

  const relative = pathname.slice(prefix.length) || "index.html";
  const target = resolve(root, relative);
  if (target !== root && !target.startsWith(root + sep)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }

  try {
    const content = await readFile(target);
    response.writeHead(200, {
      "Content-Type": types[extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404); response.end("Not found"); 
  }
});

server.listen(4173, "127.0.0.1", () => {
  console.log("GitHub Pages local mirror: http://127.0.0.1:4173" + prefix);
});
