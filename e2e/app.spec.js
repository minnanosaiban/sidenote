"use strict";
// ブラウザ（実際のChrome/Chromium）でアプリを動かして確認するテスト。
// 本番と同じCSPを付けたサーバー（e2e/server.js）で配信するので、CSPで塞がれる読み込み・
// インラインスクリプトの混入、外部への通信もここで検出できる。
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const ORIGIN = "http://localhost:4173";
const TRACKER = `${ORIGIN}/__tracker.png`;
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let problems;
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("request", (r) => {   // 同じサーバー以外（外部）への通信は起こさない
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:")) problems.push(`external request: ${u}`);
  });
  await page.goto("/");
  await expect(page.locator("#doc")).toBeVisible();
});
test.afterEach(() => { expect(problems, "エラー・CSP違反・外部通信が出ていないこと").toEqual([]); });

const paste = (page, text) => page.evaluate((t) => {
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  document.getElementById("doc").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
}, text);

const trackerHits = async (page) => (await (await page.request.get("/__tracker-hits")).json()).hits;

// 本文の指定の段落内の文字を選択して、ノート追加ポップオーバーを開く。
async function selectText(page, paraText, from, to) {
  await page.evaluate(({ paraText, from, to }) => {
    const p = [...document.querySelectorAll("#doc .para")].find((e) => e.textContent.includes(paraText));
    const n = p.firstChild;
    const r = document.createRange();
    r.setStart(n, from);
    r.setEnd(n, to);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    document.getElementById("doc").dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, { paraText, from, to });
}

async function download(page, buttonSelector) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(buttonSelector)]);
  return fs.readFileSync(await dl.path());
}

test("起動：エラーなく表示され、画面下部の注記が出ている", async ({ page }) => {
  await expect(page).toHaveTitle("サイドノート作成ツール");
  await expect(page.locator("#resumeApply")).toBeDisabled();   // 自動保存が無いので復元ボタンは無効
  // 注記は#docに段落がある状態で測った値（起動時の初期化の順序が崩れると0emになる）
  await expect(page.locator("#appFooter")).toContainText("上部余白1.1em");
});

test("書体が同梱ファイルから読み込める（外部のGoogle Fontsへ行かない）", async ({ page }) => {
  const ok = await page.evaluate(async () => {
    const fonts = ["Noto Serif JP", "Noto Sans JP", "Shippori Mincho", "Zen Old Mincho", "Zen Kaku Gothic New"];
    const loaded = await Promise.all(fonts.map((f) => document.fonts.load(`700 16px "${f}"`, "裁判の書面")));
    return loaded.map((l) => l.length > 0);
  });
  expect(ok).toEqual([true, true, true, true, true]);
});

test("Markdownを貼り付けて取り込める（見出し・リンク・リスト・表）", async ({ page }) => {
  await paste(page, "# 見出し\n\n本文の**太字**と[リンク](https://example.com)です。\n\n1. 一\n2. 二\n\n| a | b |\n|---|---|\n| 1 | 2 |\n");
  const doc = page.locator("#doc");
  await expect(doc.locator(".para-h1")).toHaveText("見出し");
  await expect(doc.locator("strong")).toHaveText("太字");
  await expect(doc.locator('a[href="https://example.com"]')).toHaveText("リンク");
  await expect(doc.locator(".para-li")).toHaveCount(2);
  await expect(doc.locator(".para-table-el td")).toHaveText(["1", "2"]);
});

test("サイドノートを付けると右に表示され、一文がロックされる", async ({ page }) => {
  await paste(page, "これは注釈を付ける一文です。");
  await selectText(page, "注釈を付ける", 3, 8);
  await expect(page.locator("#notePopover")).toBeVisible();
  await page.fill("#notePopoverInput", "確認してください");
  await page.click("#notePopoverAdd");
  await expect(page.locator("#doc .note-anchor")).toHaveCount(1);
  await expect(page.locator("#doc .note-anchor")).toHaveAttribute("contenteditable", "false");
  await expect(page.locator("#docRight .sidenote-card:not(.sidenote-sample)")).toContainText("確認してください");
});

test("リロードしても自動保存から続きを再開できる", async ({ page }) => {
  await paste(page, "再開テストの本文です。");
  await selectText(page, "再開テスト", 0, 4);
  await page.fill("#notePopoverInput", "残るノート");
  await page.click("#notePopoverAdd");
  await page.waitForTimeout(1200);   // 自動保存（800msのデバウンス）を待つ
  await page.reload();
  await expect(page.locator("#resumeApply")).toBeEnabled();
  await page.click("#resumeApply");
  await expect(page.locator("#doc")).toContainText("再開テストの本文です。");
  await expect(page.locator("#docRight .sidenote-card:not(.sidenote-sample)")).toContainText("残るノート");
});

test("セキュリティ：Markdownのリンクから属性を注入してスクリプトを動かせない", async ({ page }) => {
  await paste(page, '[x](http://a"onmouseover="window.__pwn=1) と [y](javascript:window.__pwn=2)');
  await page.locator("#doc a").first().hover();
  const result = await page.evaluate(() => ({
    pwn: window.__pwn || null,
    onAttrs: [...document.querySelectorAll("#doc *")].flatMap((e) => e.getAttributeNames().filter((n) => n.startsWith("on"))),
    jsLinks: [...document.querySelectorAll("#doc a")].filter((a) => /^javascript:/i.test(a.getAttribute("href") || "")).length,
  }));
  expect(result).toEqual({ pwn: null, onAttrs: [], jsLinks: 0 });
});

test("セキュリティ：悪意ある.jsonを開いてもスクリプト・外部通信・画面乗っ取りが起きない", async ({ page }) => {
  const hostile = {
    app: "sidenote", version: 2, mode: "text", notesByAnchor: [],
    docHTML: '<div class="para"><img src=x onerror="window.__pwn=1">' +
      '<a href="https://evil.example" style="position:fixed;inset:0;z-index:99999">乗っ取り</a>' +
      `<img src="${TRACKER}"><script>window.__pwn=2</script></div>`,
  };
  await page.setInputFiles("#loadInput", { name: "hostile.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(hostile)) });
  await expect(page.locator("#doc a")).toHaveText("乗っ取り");
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    pwn: window.__pwn || null,
    position: getComputedStyle(document.querySelector("#doc a")).position,
    scripts: document.querySelectorAll("#doc script").length,
  }));
  expect(state).toEqual({ pwn: null, position: "static", scripts: 0 });
  expect(await trackerHits(page)).toBe(0);
});

test("外部URLの画像は自動で読み込まず、「読み込む」を押した時だけ読み込む", async ({ page }) => {
  await paste(page, `前\n\n![外部の画像](${TRACKER})\n\n後`);
  const box = page.locator("#doc .para-image-external");
  await expect(box).toBeVisible();
  await expect(box).toContainText(TRACKER);
  await page.waitForTimeout(500);
  expect(await trackerHits(page)).toBe(0);
  await page.click("#doc .para-image-load-btn");
  await expect(box).toHaveCount(0);
  await expect.poll(() => trackerHits(page)).toBe(1);
});

test("同梱の画像（data:）はそのまま表示される", async ({ page }) => {
  await paste(page, `![図1 全体](${PNG})`);
  await expect(page.locator("#doc .para-image-img")).toBeVisible();
  await expect(page.locator("#doc .para-image-external")).toHaveCount(0);
});

test(".mdへ書き出すと、画像の説明文も残り、開き直しても同じになる", async ({ page }) => {
  await paste(page, `見出し前\n\n![図1 全体の様子](${PNG})\n\n![外部](https://example.com/a.png)\n\n後`);
  await expect(page.locator("#doc .para-image")).toHaveCount(2);
  const md = (await download(page, "#saveMdBtn")).toString("utf8");
  expect(md).toContain(`![図1 全体の様子](${PNG})`);
  expect(md).toContain("![外部](https://example.com/a.png)");
  // 書き出したMarkdownをもう一度取り込んで、同じものが書き出される
  await page.evaluate(() => { document.getElementById("doc").innerHTML = ""; });
  await paste(page, md);
  const md2 = (await download(page, "#saveMdBtn")).toString("utf8");
  expect(md2).toBe(md);
});

test(".jsonに保存して開き直せる（注釈つき）", async ({ page }) => {
  await paste(page, "保存して開き直す本文です。");
  await selectText(page, "保存して", 0, 4);
  await page.fill("#notePopoverInput", "保存するノート");
  await page.click("#notePopoverAdd");
  const json = await download(page, "#saveBtn");
  await page.click("#resumeDiscard");   // 「新しい作業」で空にする
  await expect(page.locator("#doc .note-anchor")).toHaveCount(0);
  await page.setInputFiles("#loadInput", { name: "saved.json", mimeType: "application/json", buffer: json });
  await expect(page.locator("#doc")).toContainText("保存して開き直す本文です。");
  await expect(page.locator("#docRight .sidenote-card:not(.sidenote-sample)")).toContainText("保存するノート");
});

test(".docxに書き出せる", async ({ page }) => {
  await paste(page, "# 見出し\n\n本文です。");
  const buf = await download(page, "#saveDocxBtn");
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");   // docxはzip
});

test("PDFを開くとPDFモードになり、ページが描画される", async ({ page }) => {
  const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
    "4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 20 100 Td (Hello) Tj ET\nendstream endobj\n" +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF";
  await page.setInputFiles("#loadInput", { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf) });
  await expect(page.locator("#pdfViewer .pdf-page canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#doc")).toBeHidden();
});
