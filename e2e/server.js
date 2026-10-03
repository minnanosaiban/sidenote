"use strict";
// e2eテスト用の静的サーバー。本番（Cloudflare Pages）と同じCSP（public/_headers）を付けて配信するので、
// CSPで塞がれる読み込みもテストで検出できる。加えて、外部画像のテスト用に「アクセスを数える」URLを持つ。
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT || 4173);
const headersFile = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
const headers = {};
for (const m of headersFile.matchAll(/^\s+([A-Za-z-]+):\s*(.+)$/gm)) headers[m[1]] = m[2].trim();

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".woff2": "font/woff2", ".bcmap": "application/octet-stream",
};
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
let trackerHits = 0;

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/__tracker.png") {   // このURLへのアクセス数を数える（外部画像を勝手に読み込んでいないかの確認用）
    trackerHits++;
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
    return res.end(PNG_1PX);
  }
  if (url.pathname === "/__tracker-hits") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ hits: trackerHits }));
  }
  const file = path.join(ROOT, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { ...headers, "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`e2e server: http://localhost:${PORT}`));
