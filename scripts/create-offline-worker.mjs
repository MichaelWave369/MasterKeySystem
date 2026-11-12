// Precache the actual production output, including the complete bundled lesson corpus.
// The worker is generated after Vite builds so its cache version changes with each release.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const base = process.env.DEPLOY_TARGET === "github-pages" ? "/MasterKeySystem/" : "/";
const dist = resolve("dist");
const names = await readdir(dist, { recursive: true });
const entries = await Promise.all(names.map(async name => ({
  name, isFile: (await stat(resolve(dist, name))).isFile(),
})));
const files = entries.filter(entry => entry.isFile && entry.name !== "sw.js")
  .map(entry => entry.name).sort();
const resources = Array.from(new Set([
  base, base + "index.html", ...files.map(name => base + name.replaceAll("\\", "/")),
]));
const hash = createHash("sha256");
for (const name of files) {
  hash.update(name);
  hash.update(await readFile(resolve(dist, name)));
}
const cacheVersion = "master-key-offline-" + hash.digest("hex").slice(0, 14);
const worker = [
  "const CACHE = " + JSON.stringify(cacheVersion) + ";",
  "const PREFIX = " + JSON.stringify(base) + ";",
  "const FILES = " + JSON.stringify(resources) + ";",
  "",
  "self.addEventListener('install', event => {",
  "  event.waitUntil((async () => {",
  "    const cache = await caches.open(CACHE);",
  "    await cache.addAll(FILES);",
  "    await self.skipWaiting();",
  "  })());",
  "});",
  "",
  "self.addEventListener('activate', event => {",
  "  event.waitUntil((async () => {",
  "    const names = await caches.keys();",
  "    await Promise.all(names.filter(name => name.startsWith('master-key-offline-') && name !== CACHE)",
  "      .map(name => caches.delete(name)));",
  "    await self.clients.claim();",
  "  })());",
  "});",
  "",
  "self.addEventListener('fetch', event => {",
  "  const request = event.request;",
  "  if (request.method !== 'GET') return;",
  "  const url = new URL(request.url);",
  "  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;",
  "  if (request.mode === 'navigate') {",
  "    event.respondWith((async () => {",
  "      try { return await fetch(request); }",
  "      catch {",
  "        const cached = await caches.match(PREFIX + 'index.html');",
  "        return cached || Response.error();",
  "      }",
  "    })());",
  "    return;",
  "  }",
  "  event.respondWith((async () => {",
  "    const cached = await caches.match(request);",
  "    return cached || fetch(request);",
  "  })());",
  "});",
].join("\n");
await writeFile(resolve(dist, "sw.js"), worker + "\n");
console.log("Offline service worker:", cacheVersion, resources.length, "resources.", base);
