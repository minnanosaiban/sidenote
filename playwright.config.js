"use strict";
const { defineConfig } = require("@playwright/test");

// ブラウザは、同梱のChromium（初回は `npx playwright install chromium`）か、
// 手元にインストール済みのChrome/Edge（PW_CHANNEL=chrome または msedge）を使える。
module.exports = defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.js",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    channel: process.env.PW_CHANNEL || undefined,
    acceptDownloads: true,
  },
  webServer: {
    command: "node e2e/server.js",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
